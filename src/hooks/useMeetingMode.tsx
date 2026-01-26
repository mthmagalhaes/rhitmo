import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MeetingRecorderDialog, MeetingProcessingDialog, MeetingReviewDialog, ExtractedFeedback, MeetingAnalysis } from '@/components/meeting';
import { MeetingRecorderData } from '@/hooks/useMeetingRecorder';

interface UseMeetingModeProps {
  memberId: string;
  memberName: string;
  userId: string;
}

export const useMeetingMode = ({ memberId, memberName, userId }: UseMeetingModeProps) => {
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [processingOpen, setProcessingOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  
  const [processingChunks, setProcessingChunks] = useState(0);
  const [currentProcessingChunk, setCurrentProcessingChunk] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const [meetingAnalysis, setMeetingAnalysis] = useState<MeetingAnalysis | null>(null);
  const [meetingTranscriptId, setMeetingTranscriptId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const openRecorder = () => setRecorderOpen(true);

  const handleRecordingComplete = async (data: MeetingRecorderData) => {
    setRecorderOpen(false);
    setProcessingOpen(true);
    setProcessingChunks(data.chunks.length);
    setCurrentProcessingChunk(0);
    setRecordingDuration(data.totalDuration);
    setIsAnalyzing(false);

    try {
      // Step 1: Transcribe all chunks
      const chunksForApi = data.chunks.map(c => ({
        audio: c.base64,
        index: c.index,
      }));

      console.log(`Sending ${chunksForApi.length} chunks for transcription`);
      
      const { data: transcribeResult, error: transcribeError } = await supabase.functions.invoke('transcribe-meeting', {
        body: {
          chunks: chunksForApi,
          mimeType: data.mimeType,
        }
      });

      if (transcribeError) throw transcribeError;
      if (!transcribeResult?.transcript) throw new Error('No transcript returned');

      setCurrentProcessingChunk(data.chunks.length);
      setIsAnalyzing(true);

      console.log('Transcript received, length:', transcribeResult.transcript.length);

      // Step 2: Save meeting transcript to database
      const { data: transcriptRecord, error: insertError } = await supabase
        .from('meeting_transcripts')
        .insert({
          member_id: memberId,
          manager_id: userId,
          duration_seconds: data.totalDuration,
          chunk_count: data.chunks.length,
          transcript: transcribeResult.transcript,
          leader_notes: data.leaderNotes,
          processing_status: 'processing',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Failed to save transcript:', insertError);
        // Continue anyway, we can still analyze
      } else {
        setMeetingTranscriptId(transcriptRecord?.id || null);
      }

      // Step 3: Process meeting for feedback extraction
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('process-meeting', {
        body: {
          transcript: transcribeResult.transcript,
          memberName,
          leaderNotes: data.leaderNotes,
        }
      });

      if (analysisError) throw analysisError;

      console.log('Analysis complete:', analysisResult);

      // Update transcript status
      if (transcriptRecord?.id) {
        await supabase
          .from('meeting_transcripts')
          .update({
            processing_status: 'completed',
            extracted_themes: analysisResult.themes || [],
            extracted_commitments: analysisResult.commitments || [],
          })
          .eq('id', transcriptRecord.id);
      }

      setMeetingAnalysis({
        feedbacks: analysisResult.feedbacks || [],
        commitments: analysisResult.commitments || [],
        themes: analysisResult.themes || [],
      });

      setProcessingOpen(false);
      setReviewOpen(true);

    } catch (error: any) {
      console.error('Meeting processing error:', error);
      setProcessingOpen(false);
      toast({
        title: 'Erro ao processar reunião',
        description: error.message || 'Não foi possível processar a gravação.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveFeedbacks = async (feedbacks: ExtractedFeedback[], commitments: string[]) => {
    try {
      // Insert feedbacks to database
      const feedbacksToInsert = feedbacks.map(f => ({
        member_id: memberId,
        manager_id: userId,
        content: f.content,
        type: f.type === 'positive' ? 'positive' : 'constructive',
        summary: f.content,
        coaching_tips: f.coaching_tip,
        source: 'meeting',
        meeting_transcript_id: meetingTranscriptId,
      }));

      if (feedbacksToInsert.length > 0) {
        const { error } = await supabase.from('feedbacks').insert(feedbacksToInsert);
        if (error) throw error;
      }

      // Invalidate feedbacks query to refresh timeline
      queryClient.invalidateQueries({ queryKey: ['feedbacks', memberId] });

      toast({
        title: 'Feedbacks salvos!',
        description: `${feedbacks.length} feedbacks da reunião foram adicionados ao histórico.`,
      });

      // Reset state
      setMeetingAnalysis(null);
      setMeetingTranscriptId(null);

    } catch (error: any) {
      console.error('Error saving feedbacks:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar os feedbacks.',
        variant: 'destructive',
      });
      throw error; // Re-throw to prevent dialog close
    }
  };

  const handleDiscardAnalysis = () => {
    setMeetingAnalysis(null);
    setMeetingTranscriptId(null);
  };

  // Render components
  const MeetingModeDialogs = () => (
    <>
      <MeetingRecorderDialog
        open={recorderOpen}
        onOpenChange={setRecorderOpen}
        memberName={memberName}
        memberId={memberId}
        onComplete={handleRecordingComplete}
      />

      <MeetingProcessingDialog
        open={processingOpen}
        totalChunks={processingChunks}
        currentChunk={currentProcessingChunk}
        isAnalyzing={isAnalyzing}
        totalDuration={recordingDuration}
      />

      {meetingAnalysis && (
        <MeetingReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          memberName={memberName}
          duration={recordingDuration}
          analysis={meetingAnalysis}
          onSave={handleSaveFeedbacks}
          onDiscard={handleDiscardAnalysis}
        />
      )}
    </>
  );

  return {
    openRecorder,
    MeetingModeDialogs,
  };
};
