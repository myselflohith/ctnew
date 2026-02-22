import pool from '../database/connection.js';

/**
 * Call OpenAI API for interview scoring
 * Matches ch-job-marketplace InterviewReportService
 */
async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for better performance and cost
      messages: [
        {
          role: 'system',
          content: 'You are an expert interview evaluator. Evaluate the candidate\'s responses based on accuracy, coherence, technical depth, application, and sentiment. Return only valid JSON without any markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
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

Example of weighted calculation:
If Question 1 (weight 10) has a score of 90, Question 2 (weight 1) has a score of 20, and Question 3 (weight 1) has a score of 20:
Weighted Average = ((90 * 10) + (20 * 1) + (20 * 1)) / (10 + 1 + 1) = (900 + 20 + 20) / 12 = 940 / 12 = 78.33

Example of evaluation below:

Poor Performed Interview (Score: 20/100):
question: "Can you explain what a p-value is?"
answer: "It's a value you get from data, I think."
evaluation: The answer is vague and lacks understanding of the statistical concept. The candidate fails to explain the significance or application of the p-value in hypothesis testing.
rating: Poor
score_breakdown:
- Accuracy: 20/100 - Explanation is too vague to demonstrate understanding.
- Coherence: 30/100 - The response lacks logical structure.
- Technical Depth: 20/100 - The candidate shows little understanding of the concept.
- Application: 30/100 - No practical application was mentioned.
- Sentiment: 30/100 - The candidate seemed unsure.

Average Performed Interview (Score: 60/100):
question: "What is the purpose of using indexes in a database?"
answer: "Indexes are used to make searches faster in a database."
evaluation: The candidate correctly identifies the primary function of indexes but does not discuss other aspects, such as how they work, types of indexes, or their impact on database performance.
rating: Average
score_breakdown:
- Accuracy: 60/100 - The response is accurate but lacks detail.
- Coherence: 60/100 - The answer is clear and logical.
- Technical Depth: 55/100 - Basic understanding demonstrated.
- Application: 60/100 - Practical application was mentioned.
- Sentiment: 65/100 - The candidate showed reasonable confidence.

Great Performed Interview (Score: 80/100):
question: "What are the key considerations when designing a dashboard for data visualization?"
answer: "The key considerations include understanding the target audience, ensuring data accuracy, choosing appropriate visual elements, and maintaining clarity. It's also important to design for interactivity to allow users to drill down into the data."
evaluation: The candidate demonstrates a thorough understanding of data visualization principles and can articulate how to apply them in practical scenarios.
rating: Great
score_breakdown:
  - Accuracy: 80/100 - The answer is highly accurate and detailed.
  - Coherence: 75/100 - The response is well-structured and logical.
  - Technical Depth: 75/100 - The candidate demonstrates solid understanding.
  - Application: 80/100 - Practical applications were well explained.
  - Sentiment: 85/100 - The candidate appeared confident.

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
 * Process Interview Scoring - Matches ch-job-marketplace ai_interview_feedback.rake
 * Gets 15 unscored interviews and evaluates them with OpenAI GPT-4
 */
export async function processInterviewScoring() {
  console.log('🔄 Starting interview scoring process...');

  try {
    const client = await pool.connect();

    try {
      // Get unscored, completed interviews - matching ch-job-marketplace exactly
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
        WHERE air.rating IS NULL 
          AND air.ai_feedback IS NULL
          AND aii.status = 'Completed'
          AND air.interview_start_at IS NOT NULL
          AND aii.discarded_at IS NULL
          AND air.discarded_at IS NULL
        ORDER BY air.created_at ASC
        LIMIT 15`
      );

      console.log(`📊 Total Interview: ${unscoreInterviews.rows.length}`);

      if (unscoreInterviews.rows.length === 0) {
        console.log('✅ No interviews to score');
        return;
      }

      // Process each interview
      for (const data of unscoreInterviews.rows) {
        try {
          console.log(`\n⏳ Processing interview report ID: ${data.id}`);

          // Get all report details for this interview
          const aiInterviewReports = await client.query(
            `SELECT id, ai_interview_report_id, question, transcript_text, question_weight
             FROM ai_interview_report_details
             WHERE ai_interview_report_id = $1
             ORDER BY created_at ASC`,
            [data.id]
          );

          if (aiInterviewReports.rows.length === 0) {
            console.log(`⚠️  No report details found for ID ${data.id}, skipping...`);
            continue;
          }

          // Generate prompt and get AI feedback
          const prompt = generatePrompt(aiInterviewReports.rows);
          const aiFeedback = await callOpenAI(prompt);

          // Parse the AI feedback, handle potential JSON parsing errors
          let parsedData: any;
          try {
            const cleanedResponse = aiFeedback
              .replace(/```json/g, '')
              .replace(/```/g, '')
              .trim();
            parsedData = JSON.parse(cleanedResponse);
          } catch (parseError) {
            console.error(`❌ JSON Parsing error for interview report ID ${data.id}:`, parseError);
            continue;
          }

          // Accessing data from parsed response
          const evaluations = parsedData.evaluations || [];
          const finalScore = parsedData.final_score || {};

          // Iterate over evaluations and update report details
          for (const evaluation of evaluations) {
            console.log(`📝 Evaluation ${evaluation.question_id}: ${evaluation.rating}`);

            for (const aiInterviewReport of aiInterviewReports.rows) {
              if (
                aiInterviewReport.id === evaluation.question_id ||
                aiInterviewReport.question === evaluation.question
              ) {
                // Update interview report details
                // Store only the evaluation text in ai_feedback, rating should be just the rating word
                await client.query(
                  `UPDATE ai_interview_report_details
                   SET ai_feedback = $1,
                       rating = $2,
                       score = $3,
                       updated_at = NOW()
                   WHERE id = $4`,
                  [
                    evaluation.evaluation,
                    evaluation.rating, // This is "Great"/"Average"/"Poor" - NOT the full evaluation text
                    JSON.stringify(evaluation.score_breakdown),
                    aiInterviewReport.id
                  ]
                );
              }
            }
          }

          // Update the main AiInterviewReport with feedback and final score
          // NOTE: ai_interview_reports.score is VARCHAR(50) in schema.sql.
          // finalScore JSON can exceed 50 chars, so store a compact value instead.
          const overallScoreValue =
            typeof finalScore.overall_rating === 'string'
              ? finalScore.overall_rating
              : String(finalScore.overall_rating ?? 'Average');

          await client.query(
            `UPDATE ai_interview_reports
             SET ai_feedback = $1,
                 rating = $2,
                 score = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [
              JSON.stringify(parsedData),
              overallScoreValue,
              overallScoreValue,
              data.id
            ]
          );

          console.log(`✅ Processed report ${data.id}: ${finalScore.overall_rating} (Score: ${finalScore.overall_rating})`);

          // Send notifications based on rating and interview type
          const rating = finalScore.overall_rating?.toString().toLowerCase() || '';

          // For Actual interviews - send notification to employer
          if (data.type_of_interview !== 'Practice') {
            console.log(`📧 Notification sent for actual interview: ${data.candidate_name}`);
            // Email service would be called here
          }

          // For Practice interviews - send notifications to candidate
          if (data.type_of_interview === 'Practice') {
            console.log(`📧 Practice interview notification sent to: ${data.candidate_email}`);
            // Email service would be called here
          }

          // Poor rating candidate archived with reason
          if (rating.includes('poor')) {
            await client.query(
              `UPDATE ai_interview_invites
               SET reason = $1, discarded_at = NOW(), updated_at = NOW()
               WHERE id = $2`,
              ['Poor Interview', data.ai_interview_invite_id]
            );
            console.log(`🔒 Archived candidate: ${data.candidate_name} (Poor performance)`);
          }

        } catch (error) {
          console.error(`❌ Error processing interview report ID ${data.id}:`, error);
          // Continue with next interview instead of breaking
        }
      }

      console.log('✅ Interview scoring process completed');

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Interview scoring cron job failed:', error);
  }
}

/**
 * Auto archiving poor results - Second cron task from ch-job-marketplace
 */
export async function autoArchivingPoorResults() {
  console.log('🔍 Running auto-archiving for poor results...');

  try {
    const completedInterviews = await pool.query(
      `SELECT aii.id, aii.candidate_name
       FROM ai_interview_invites aii
       INNER JOIN ai_interview_reports air ON aii.id = air.ai_interview_invite_id
       WHERE aii.status = 'Completed'
         AND air.rating ILIKE '%poor%'
         AND aii.discarded_at IS NULL`
    );

    if (completedInterviews.rows.length > 0) {
      console.log(`📌 Found ${completedInterviews.rows.length} poor performing interviews`);

      for (const interview of completedInterviews.rows) {
        await pool.query(
          `UPDATE ai_interview_invites
           SET reason = $1, discarded_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          ['Poor Interview', interview.id]
        );
        console.log(`🔒 Archived: ${interview.candidate_name}`);
      }
    }
  } catch (error) {
    console.error('❌ Error in auto-archiving:', error);
  }
}

export default { processInterviewScoring, autoArchivingPoorResults };
