import pool from '../database/connection.js';

/**
 * Call OpenAI API for interview scoring
 */
async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            "You are an expert interview evaluator. Evaluate the candidate's responses based on accuracy, coherence, technical depth, application, and sentiment. Return only valid JSON without any markdown formatting.",
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.statusText} - ${error}`);
  }

  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Generate prompt matching ch-job-marketplace exactly
 */
function generatePrompt(reportDetails: any[]): string {
  let questionAndAnswers = '';
  reportDetails.forEach((data: any, index: number) => {
    questionAndAnswers += `Question_${index + 1}: ${data.question}\n`;
    questionAndAnswers += `Answer_${index + 1}: ${data.transcript_text}\n`;
    questionAndAnswers += `Question_id_${index + 1}: ${data.id}\n\n`;
    questionAndAnswers += `question_weight: ${data.question_weight || 1}\n\n`;
  });

  return `
I have the following questions and answers from a candidate. Please evaluate each answer, provide an AI rating (e.g., Great, Average, Poor), and give feedback explaining the rating. 
The feedback should cover the strengths of the answer and suggest areas for improvement where applicable.
For each evaluation, return a JSON output.

CRITICAL - WEIGHTAGE SYSTEM:
Each question has a specific weight (question_weight) ranging from 1 to 10.
- question_weight 10: Extremely Important / Critical.
- question_weight 1: Low Importance.

You MUST use these weights to calculate the final weighted average score for each category (accuracy, coherence, technical_depth, application, sentiment) across the entire interview.
A candidate's performance on a question with question_weight 10 MUST impact the final score 10 times more than a question with question_weight 1.

CALCULATION FORMULA YOU MUST FOLLOW for each category (e.g., Accuracy):
Final Category Score = Sum(Individual_Question_Score * question_weight) / Sum(All_Weights)

The "overall_rating" in the "final_score" block MUST be derived by taking the simple average of the "average_accuracy", "average_coherence", "average_technical_depth", "average_application", and "average_sentiment" scores.

Json Output Example always return similar and make sure question_id will match with question answer list.
IMPORTANT: Ensure the JSON is valid and does not contain trailing commas.

{
  "evaluations": [
    {
      "question_id": 12,
      "question_weight": 1,
      "question": "Tell me about yourself?",
      "evaluation": "The candidate provides a concise overview of their professional background, highlighting key technologies and frameworks they have experience with.",
      "rating": "Average",
      "score_breakdown": {
        "accuracy": 80,
        "coherence": 85,
        "technical_depth": 70,
        "application": 75,
        "sentiment": 80
      }
    }
  ],
  "final_score": {
    "weighted_calculation_logic": "Accuracy: ((80 * 1)) / (1) = 80",
    "average_accuracy": 80,
    "average_coherence": 85,
    "average_technical_depth": 70,
    "average_application": 75,
    "average_sentiment": 80,
    "overall_rating": "Average"
  }
}

The following are questions and answers from a job interview:

${questionAndAnswers}

Final AI rating:
`;
}

/**
 * Generate AI feedback + scoring for a completed interview report.
 * Called immediately after interview completion (no cron dependency).
 */
export async function generateInterviewFeedback(reportId?: number) {
  console.log('🔄 Starting interview scoring process...');

  try {
    const client = await pool.connect();

    try {
      const unscoreInterviews = await client.query(
        `SELECT 
          air.id,
          air.interview_id,
          air.ai_interview_invite_id,
          air.interview_start_at,
          ai.type_of_interview,
          aii.status,
          aii.candidate_name,
          aii.candidate_email,
          ai.interview_title
        FROM ai_interview_reports air
        INNER JOIN ai_interview_invites aii ON air.ai_interview_invite_id = aii.id
        INNER JOIN ai_interviews ai ON air.interview_id = ai.id
        WHERE (
          (air.rating IS NULL OR air.rating = '')
          OR (air.ai_feedback IS NULL OR air.ai_feedback = '')
          OR (air.score IS NULL OR air.score = '')
        )
          -- IMPORTANT:
          -- Poor interviews may be auto-archived by setting aii.discarded_at, but they must STILL be scored
          -- and have their report generated. So do NOT exclude discarded invites.
          AND aii.status IN ('Completed','Partially Completed')
          AND air.interview_start_at IS NOT NULL
          AND air.discarded_at IS NULL
          AND ($1::int IS NULL OR air.id = $1::int)
        ORDER BY air.created_at ASC
        LIMIT 15`,
        [reportId ?? null]
      );

      console.log(`📊 Total Interview: ${unscoreInterviews.rows.length}`);

      if (unscoreInterviews.rows.length === 0) {
        console.log('✅ No interviews to score');
        return;
      }

      for (const data of unscoreInterviews.rows) {
        try {
          console.log(`\n⏳ Processing interview report ID: ${data.id}`);

          const aiInterviewReports = await client.query(
            `SELECT id, ai_interview_report_id, question, transcript_text, question_weight
             FROM ai_interview_report_details
             WHERE ai_interview_report_id = $1
             ORDER BY created_at ASC`,
            [data.id]
          );

          // IMPORTANT:
          // Do not generate AI feedback/scoring when there are no real answers.
          // Some flows were creating report_detail rows with empty transcript_text ("No response provided"),
          // which caused OpenAI to invent evaluations and an overall rating.
          const answeredRows = (aiInterviewReports.rows || []).filter((r: any) =>
            (r?.transcript_text || '').toString().trim().length > 0
          );

          if (answeredRows.length === 0) {
            console.log(`⚠️  No answered questions for report ID ${data.id}, skipping scoring...`);
            continue;
          }

          const prompt = generatePrompt(answeredRows);
          const aiFeedback = await callOpenAI(prompt);

          let parsedData: any;
          try {
            const cleanedResponse = aiFeedback.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedData = JSON.parse(cleanedResponse);
          } catch (parseError) {
            console.error(`❌ JSON Parsing error for interview report ID ${data.id}:`, parseError);
            continue;
          }

          const evaluations = parsedData.evaluations || [];
          const finalScore = parsedData.final_score || {};

          for (const evaluation of evaluations) {
            console.log(`📝 Evaluation ${evaluation.question_id}: ${evaluation.rating}`);

            for (const aiInterviewReport of aiInterviewReports.rows) {
              if (aiInterviewReport.id === evaluation.question_id || aiInterviewReport.question === evaluation.question) {
                await client.query(
                  `UPDATE ai_interview_report_details
                   SET ai_feedback = $1,
                       rating = $2,
                       score = $3,
                       updated_at = NOW()
                   WHERE id = $4`,
                  [evaluation.evaluation, evaluation.rating, JSON.stringify(evaluation.score_breakdown), aiInterviewReport.id]
                );
              }
            }
          }

          const overallScoreValue =
            typeof finalScore.overall_rating === 'string'
              ? finalScore.overall_rating
              : String(finalScore.overall_rating ?? 'Average');

          // Persist:
          //  - ai_feedback: full JSON payload (evaluations + final_score)
          //  - rating: overall_rating string (e.g. Great/Average/Poor)
          //  - score: JSON (final_score block) so UI can render breakdown reliably
          await client.query(
            `UPDATE ai_interview_reports
             SET ai_feedback = $1,
                 rating = $2,
                 score = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [JSON.stringify(parsedData), overallScoreValue, JSON.stringify(finalScore || {}), data.id]
          );

          console.log(`✅ Processed report ${data.id}: ${finalScore.overall_rating} (Score stored as final_score JSON)`);

          // Poor interview handling:
          // NOTE: This block runs AFTER scoring has been persisted.
          // Even if the invite is archived (discarded_at set), report must exist and stay visible.
          const rating = finalScore.overall_rating?.toString().toLowerCase() || '';

          if (rating.includes('poor')) {
            // Always set reason for visibility (even if archiving)
            await client.query(
              `UPDATE ai_interview_invites
               SET reason = $1, updated_at = NOW()
               WHERE id = $2`,
              ['Poor Interview', data.ai_interview_invite_id]
            );

            // Auto-archive poor interviews (requested behavior):
            // Candidate will move to Archived list (discarded_at set) after scoring.
            // NOTE: They won't show in Active lists anymore, but will be visible under Archived.
            //
            // CRITICAL: Only archive AFTER we've successfully persisted rating/score/ai_feedback.
            // (This prevents "Archived but N/A" scenarios.)
            const shouldArchive =
              (process.env.AUTO_ARCHIVE_POOR_INTERVIEWS || 'true').toLowerCase() === 'true';

            const persistedOk =
              overallScoreValue &&
              overallScoreValue.toString().trim().length > 0 &&
              parsedData &&
              finalScore;

            if (shouldArchive && persistedOk) {
              await client.query(
                `UPDATE ai_interview_invites
                 SET discarded_at = COALESCE(discarded_at, NOW()),
                     updated_at = NOW()
                 WHERE id = $1`,
                [data.ai_interview_invite_id]
              );
              console.log(`🗄️ Auto-archived poor interview invite: ${data.candidate_name}`);
            } else if (shouldArchive && !persistedOk) {
              console.warn(
                `⚠️ Skipping auto-archive for invite ${data.ai_interview_invite_id} because score persistence was not confirmed`
              );
            } else {
              console.log(`⚠️ Marked candidate as Poor Interview (auto-archive disabled): ${data.candidate_name}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error processing interview report ID ${data.id}:`, error);
        }
      }

      console.log('✅ Interview scoring process completed');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Interview scoring failed:', error);
  }
}

export default { generateInterviewFeedback };
