import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, AlertCircle, CheckCircle, TrendingUp, Calendar, User, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { employerNavItems } from '@/components/layout/navItems';
import { apiClient } from '@/lib/api';
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
} from 'lucide-react';

const navItems = employerNavItems;

interface ReportDetail {
  id: number;
  question: string;
  transcript_text: string;
  score: string | null;
  rating: string | null;
  ai_feedback: string | null;
  que_type: string;
  created_at: string;
}

interface InterviewReport {
  id: number;
  interview_id: number;
  ai_interview_invite_id: number;
  interview_start_at: string;
  transcript_text: string;
  interview_video_url: string | null;
  rating: string | null;
  score: string | null;
  ai_feedback: string | null;
  candidate_name: string;
  candidate_email: string;
  interview_title: string;
  interview_category: string;
  details: ReportDetail[];
  created_at: string;
  updated_at: string;
}

const EmployerCandidateReportPage = () => {
  const { reportId, inviteId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse scores safely
  const parseScore = (scoreStr: any) => {
    if (!scoreStr) return null;
    try {
      if (typeof scoreStr === 'string') {
        return JSON.parse(scoreStr);
      }
      return scoreStr;
    } catch {
      return scoreStr;
    }
  };

  // Parse feedback safely
  const parseFeedback = (feedbackStr: any) => {
    if (!feedbackStr) return null;
    try {
      if (typeof feedbackStr === 'string' && feedbackStr.startsWith('{')) {
        return JSON.parse(feedbackStr);
      }
      return feedbackStr;
    } catch {
      return feedbackStr;
    }
  };

  // Fetch interview report
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);

        // Use inviteId if available, otherwise use reportId
        let endpoint: string;
        if (inviteId) {
          endpoint = `/interviews/employer/report-by-invite/${inviteId}`;
        } else {
          endpoint = `/interviews/reports/${reportId}`;
        }

        console.log(`📊 Fetching report from: ${endpoint}`);

        const response = await apiClient.request<InterviewReport>(endpoint, {
          method: 'GET',
        });

        console.log('📋 Report API Response:', response);

        if (response.success && response.data) {
          setReport(response.data);
        } else {
          setError(response.error || 'Failed to load report data');
          console.error('Error response:', response);
        }
      } catch (err: any) {
        // apiClient.request may throw if the server returns non-JSON (e.g. plain text "Pending...").
        // Show a friendly message instead of surfacing JSON parse errors.
        console.error("Error fetching report:", err);

        const msg = String(err?.message || "");
        if (msg.includes("Unexpected token") || msg.toLowerCase().includes("json")) {
          setError("Report is still processing. Please try again in a few minutes.");
        } else {
          setError("Error loading report: " + (err?.message || "Unknown error"));
        }
      } finally {
        setLoading(false);
      }
    };

    if (inviteId || reportId) {
      fetchReport();
    }
  }, [inviteId, reportId]);

  const handleDownloadPDF = () => {
    if (!report) return;
    
    // Create a printable HTML version
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Could not open print window');
      return;
    }

    const htmlContent = generatePrintableHTML(report);
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const generatePrintableHTML = (reportData: InterviewReport) => {
    const questionsHtml = reportData.details
      .map(
        (detail, index) => `
      <div style="margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
        <div style="background-color: #edf2f7; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold; color: #2d3748;">Question ${index + 1}</span>
          <span style="color: #059669; font-weight: bold;">${detail.rating || 'Pending'}</span>
        </div>
        
        <div style="padding: 20px;">
          <div style="margin-bottom: 15px;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #4a5568; font-size: 14px; text-transform: uppercase;">Question:</p>
            <p style="margin: 0; color: #2d3748; font-size: 16px;">${detail.question}</p>
          </div>

          <div style="margin-bottom: 15px;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #4a5568; font-size: 14px; text-transform: uppercase;">Response:</p>
            <div style="background-color: #fff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 4px; font-style: italic; color: #4a5568;">
              ${detail.transcript_text}
            </div>
          </div>

          ${
            detail.ai_feedback
              ? `
            <div>
              <p style="margin: 0 0 8px; font-weight: bold; color: #4a5568; font-size: 14px; text-transform: uppercase;">AI Feedback:</p>
              <p style="margin: 0; color: #2d3748;">${detail.ai_feedback}</p>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Interview Report - ${reportData.candidate_name}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { padding: 40px; max-width: 800px; margin: auto; }
          .header { text-align: center; border-bottom: 3px solid #005999; padding-bottom: 20px; margin-bottom: 30px; }
          h1 { margin: 0; color: #005999; font-size: 28px; text-transform: uppercase; }
          .subtitle { margin: 5px 0 0; color: #666; font-size: 16px; }
          .info-box { background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
          .info-table { width: 100%; border-collapse: collapse; }
          .info-table td { padding: 8px 0; }
          .info-table td:first-child { font-weight: bold; color: #4a5568; width: 150px; }
          .info-table td:last-child { color: #2d3748; }
          h2 { color: #2d3748; border-left: 5px solid #005999; padding-left: 15px; margin-bottom: 25px; font-size: 20px; }
          .question-box { margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
          .question-header { background-color: #edf2f7; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
          .question-header span:first-child { font-weight: bold; color: #2d3748; }
          .question-header span:last-child { color: #059669; font-weight: bold; }
          .question-content { padding: 20px; }
          .question-content > div { margin-bottom: 15px; }
          .label { margin: 0 0 8px; font-weight: bold; color: #4a5568; font-size: 14px; text-transform: uppercase; }
          .content { margin: 0; color: #2d3748; font-size: 16px; }
          .response-box { background-color: #fff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 4px; font-style: italic; color: #4a5568; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Interview Assessment Report</h1>
            <p class="subtitle">Cardinal Talent - Candidate Interview Analysis</p>
          </div>

          <div class="info-box">
            <table class="info-table">
              <tr>
                <td>Candidate:</td>
                <td>${reportData.candidate_name}</td>
              </tr>
              <tr>
                <td>Email:</td>
                <td>${reportData.candidate_email}</td>
              </tr>
              <tr>
                <td>Interview:</td>
                <td>${reportData.interview_title}</td>
              </tr>
              <tr>
                <td>Category:</td>
                <td>${reportData.interview_category}</td>
              </tr>
              <tr>
                <td>Overall Rating:</td>
                <td><strong>${reportData.rating || 'Pending'}</strong></td>
              </tr>
              <tr>
                <td>Interview Date:</td>
                <td>${new Date(reportData.interview_start_at).toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          <h2>Detailed Assessment</h2>
          ${questionsHtml}

          <div class="footer">
            &copy; ${new Date().getFullYear()} Cardinal Talent. All rights reserved.<br>
            This report was automatically generated by the Cardinal Talent AI Interview System.
          </div>
        </div>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} role="employer">
        <div className="flex items-center justify-center min-h-screen">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading interview report...</p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout navItems={navItems} role="employer">
        <div className="max-w-4xl mx-auto p-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/employer/interviews')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Interviews
          </Button>

          <Card className="p-8 border-yellow-200 bg-yellow-50">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-semibold text-yellow-900 mb-2">Report Not Available</h2>
                <p className="text-yellow-800">{error}</p>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout navItems={navItems} role="employer">
        <div className="flex items-center justify-center min-h-screen">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No report found</p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const overallScore = parseScore(report.score);
  const overallFeedback = parseFeedback(report.ai_feedback);
  const totalQuestions = report.details?.length || 0;

  return (
    <DashboardLayout navItems={navItems} role="employer">
      <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/employer/interviews')}
              className="mb-4"
            >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Interviews
          </Button>

          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Candidate Interview Report</h1>
              <p className="text-muted-foreground">{report.interview_title}</p>
            </div>

            <Button onClick={handleDownloadPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-slate-900">
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* Candidate Info */}
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Candidate</p>
                  <p className="font-semibold">{report.candidate_name}</p>
                  <p className="text-xs text-muted-foreground">{report.candidate_email}</p>
                </div>
              </div>

              {/* Interview Category */}
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-semibold">{report.interview_category}</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Interview Date</p>
                  <p className="font-semibold">
                    {new Date(report.interview_start_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Overall Rating */}
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Overall Rating</p>
                  <Badge className="mt-1 bg-gradient-to-r from-cardinal to-amber text-white">
                    {report.rating || 'Pending'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="pt-6 border-t border-blue-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-cardinal">{totalQuestions}</p>
                  <p className="text-sm text-muted-foreground">Total Questions</p>
                </div>
                {overallScore && (
                  <>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600">
                        {typeof overallScore === 'object'
                          ? overallScore.overall_score || 'N/A'
                          : overallScore}
                      </p>
                      <p className="text-sm text-muted-foreground">Overall Score</p>
                    </div>
                    {typeof overallScore === 'object' && overallScore.average_rating && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-600">
                          {overallScore.average_rating}
                        </p>
                        <p className="text-sm text-muted-foreground">Avg. Rating</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Overall Feedback */}
        {overallFeedback && (
          <Card className="mb-8 bg-green-50 border-green-200 text-slate-900">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <h2 className="text-xl font-semibold text-green-900">Overall Assessment</h2>
              </div>

              {typeof overallFeedback === 'object' ? (
                <div className="space-y-4">
                  {overallFeedback.summary && (
                    <div>
                      <h3 className="font-semibold text-green-800 mb-2">Summary</h3>
                      <p className="text-green-800">{overallFeedback.summary}</p>
                    </div>
                  )}

                  {overallFeedback.strengths && (
                    <div>
                      <h3 className="font-semibold text-green-800 mb-2">Strengths</h3>
                      <ul className="list-disc list-inside space-y-1 text-green-800">
                        {(typeof overallFeedback.strengths === 'string'
                          ? overallFeedback.strengths.split('\n')
                          : overallFeedback.strengths
                        ).map((strength: string, idx: number) => (
                          <li key={idx}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {overallFeedback.areas_for_improvement && (
                    <div>
                      <h3 className="font-semibold text-green-800 mb-2">Areas for Improvement</h3>
                      <ul className="list-disc list-inside space-y-1 text-green-800">
                        {(typeof overallFeedback.areas_for_improvement === 'string'
                          ? overallFeedback.areas_for_improvement.split('\n')
                          : overallFeedback.areas_for_improvement
                        ).map((area: string, idx: number) => (
                          <li key={idx}>{area}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-green-800">{overallFeedback}</p>
              )}
            </div>
          </Card>
        )}

        {/* Question-by-Question Assessment */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold mb-6">Question-by-Question Assessment</h2>

          {report.details && report.details.length > 0 ? (
            report.details.map((detail, index) => {
              const questionScore = parseScore(detail.score);
              const questionFeedback = parseFeedback(detail.ai_feedback);

              return (
                <Card key={detail.id} className="overflow-hidden text-slate-900">
                  <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 border-b border-blue-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cardinal text-white flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <h3 className="font-semibold">Question {index + 1}</h3>
                      </div>

                      {detail.rating && (
                        <Badge variant="outline" className="bg-white text-slate-900">
                          {detail.rating}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Question */}
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Question
                      </p>
                      <p className="text-base font-medium text-foreground">{detail.question}</p>
                    </div>

                    {/* Answer */}
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Candidate's Response
                      </p>
                      <div className="bg-secondary/50 p-4 rounded-lg border border-border italic text-foreground">
                        {detail.transcript_text || 'No response provided'}
                      </div>
                    </div>

                    {/* Feedback */}
                    {questionFeedback && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          AI Assessment
                        </p>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-slate-900">
                          {typeof questionFeedback === 'object' ? (
                            <div className="space-y-2">
                              {questionFeedback.feedback && (
                                <p className="text-slate-900">{questionFeedback.feedback}</p>
                              )}
                              {questionFeedback.strengths && (
                                <div>
                                  <p className="font-semibold text-green-900">Strengths:</p>
                                  <p className="text-slate-900">{questionFeedback.strengths}</p>
                                </div>
                              )}
                              {questionFeedback.improvements && (
                                <div>
                                  <p className="font-semibold text-green-900">Areas to Improve:</p>
                                  <p className="text-slate-900">{questionFeedback.improvements}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p>{questionFeedback}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Score Breakdown */}
                    {questionScore && typeof questionScore === 'object' && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          Score Breakdown
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {Object.entries(questionScore).map(([key, value]: [string, any]) => (
                            <div
                              key={key}
                              className="text-center p-3 bg-secondary rounded-lg border border-border"
                            >
                              <p className="text-xs text-muted-foreground capitalize mb-1">
                                {key.replace(/_/g, ' ')}
                              </p>
                              <p className="text-lg font-bold text-cardinal">{value}/10</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-8 text-center border-dashed">
              <p className="text-muted-foreground">No detailed assessment available yet</p>
            </Card>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-12 mb-8 flex justify-center gap-4">
          <Button
            onClick={() => navigate('/employer/interviews')}
            variant="outline"
            className="px-8"
          >
            Back to Interviews
          </Button>
          <Button onClick={handleDownloadPDF} className="px-8 bg-gradient-to-r from-cardinal to-amber">
            <Download className="w-4 h-4 mr-2" />
            Download Full Report
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployerCandidateReportPage;
