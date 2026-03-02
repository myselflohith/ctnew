import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, AlertCircle, CheckCircle, TrendingUp, Calendar, User, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  answered_count?: number;
  total_questions?: number;
  completion_percentage?: number;
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

  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string>('Video');

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
    // If interview is not sufficiently complete, do not allow exporting a report PDF.
    const totalQ = Number(reportData.total_questions ?? reportData.details?.length ?? 0);
    const answered = Number(reportData.answered_count ?? reportData.details?.length ?? 0);
    const pct = Number(
      reportData.completion_percentage ?? (totalQ > 0 ? Math.round((answered / totalQ) * 100) : 0)
    );

    if (pct < 80) {
      return `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>Interview Report</title></head>
          <body style="font-family: Arial, sans-serif; padding: 40px;">
            <h2>Report Not Available</h2>
            <p>
              This interview is only ${pct}% complete (${answered}/${totalQ}). Detailed AI report is available once the
              interview reaches at least 80% completion.
            </p>
          </body>
        </html>
      `;
    }
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
                <td><strong>${reportData.rating || ((reportData as any)?.is_processing ? 'Generating...' : 'Pending')}</strong></td>
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

  const overallFeedback = parseFeedback(report.ai_feedback);
  const totalQuestions = Number(report.total_questions ?? report.details?.length ?? 0);
  const answeredCount = Number(report.answered_count ?? report.details?.length ?? 0);
  const completionPercentage =
    Number(report.completion_percentage ?? (totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0));

  // Only show overall rating when interview completion is >= 80%.
  const showOverallRatingAndScore = completionPercentage >= 80;

  // If interview is not sufficiently complete, do not show the report details page.
  // Employer can still see the candidate in the list, but the detailed AI report is gated.
  if (completionPercentage < 80) {
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
                <p className="text-yellow-800">
                  This interview is only {completionPercentage}% complete ({answeredCount}/{totalQuestions}).
                  Detailed AI report and overall rating are available once the interview reaches at least 80% completion.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} role="employer">
      <div className="max-w-4xl mx-auto">
        <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{activeVideoTitle}</DialogTitle>
            </DialogHeader>

            {activeVideoUrl ? (
              <video
                controls
                preload="metadata"
                className="w-full rounded-md border border-border bg-black"
                src={activeVideoUrl}
              />
            ) : (
              <p className="text-muted-foreground">No video selected.</p>
            )}
          </DialogContent>
        </Dialog>
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
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

              {/* Completion */}
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Completion</p>
                  <Badge className="mt-1 bg-amber-600 text-white">
                    {completionPercentage}% ({answeredCount}/{totalQuestions})
                  </Badge>
                </div>
              </div>

              {/* Overall Rating (hidden if <80% complete) */}
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Overall Rating</p>
                  <Badge className="mt-1 bg-gradient-to-r from-cardinal to-amber text-white">
                    {showOverallRatingAndScore
                      ? report.rating || ((report as any)?.is_processing ? "Generating..." : "Pending")
                      : "Hidden (<80% complete)"}
                  </Badge>
                </div>
              </div>
            </div>

          </div>
        </Card>

          {/* Overall Assessment (details) */}
          <Card className="mb-6 bg-gradient-to-r from-cardinal/10 to-amber/10 border-cardinal/20 text-slate-900">
            <div className="p-5">
              <h2 className="text-xl font-semibold text-foreground">Overall Assessment</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Question-by-question evaluation and scoring breakdown
              </p>
            </div>
          </Card>

          <div className="space-y-6">

            {report.details && report.details.length > 0 ? (
              report.details.map((detail, index) => {
                const questionScore = parseScore(detail.score);
                const questionFeedback = parseFeedback(detail.ai_feedback);                return (
                  <Card key={detail.id} className="overflow-hidden text-slate-900">
                    <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 border-b border-blue-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cardinal text-white flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <h3 className="font-semibold">Question {index + 1}</h3>
                        </div>

                      </div>
                    </div>

                  <div className="p-6 space-y-4">

                    {/* Question */}
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Question
                      </p>
                      <div className="bg-secondary/50 p-4 rounded-lg border border-border text-foreground">
                        {detail.question || 'N/A'}
                      </div>
                    </div>

                    {/* Answer */}
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Candidate's Response
                      </p>
                      <div className="bg-secondary/50 p-4 rounded-lg border border-border italic text-foreground">
                        {detail.transcript_text || 'No response provided'}
                      </div>

                      {(detail as any).video_url && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Video Recording
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => {
                              setActiveVideoUrl((detail as any).video_url);
                              setActiveVideoTitle(`Question ${index + 1} Video`);
                              setVideoModalOpen(true);
                            }}
                          >
                            View Video
                          </Button>
                        </div>
                      )}
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
                              <p className="text-lg font-bold text-cardinal">{value}/100</p>
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
