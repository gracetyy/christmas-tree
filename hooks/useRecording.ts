import { useState } from 'react';
import { PhotoData } from '../types';

export const useRecording = (photos: PhotoData[]) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingType, setRecordingType] = useState<'FULL' | 'ALBUM' | null>(null);

    const handleRecordVideo = (type: 'FULL' | 'ALBUM') => {
        if (isRecording) return;

        // Set flags first so HUD + overlays render before we capture the stream
        setIsRecording(true);
        setRecordingType(type);

        // Defer capture to next frame so HUD (greeting) is present in the canvas
        requestAnimationFrame(() => {
            const canvas = document.querySelector('canvas');
            if (!canvas) {
                setIsRecording(false);
                setRecordingType(null);
                alert('Unable to find canvas to record.');
                return;
            }

            // Determine the best supported MIME type
            const formats = [
                'video/mp4;codecs=h264',
                'video/mp4',
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8',
                'video/webm'
            ];

            const supportedMimeType = formats.find(f => MediaRecorder.isTypeSupported(f)) || 'video/webm';
            const extension = supportedMimeType.includes('mp4') ? 'mp4' : 'webm';

            console.log(`Starting recording with MIME type: ${supportedMimeType}`);

            const stream = canvas.captureStream(30);
            let mediaRecorder: MediaRecorder;
            try {
                mediaRecorder = new MediaRecorder(stream, {
                    mimeType: supportedMimeType,
                    videoBitsPerSecond: 5000000 // 5Mbps
                });
            } catch (err) {
                console.error('MediaRecorder init failed, falling back to webm:', err);
                mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm',
                    videoBitsPerSecond: 5000000
                });
            }

            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                }
            };
            mediaRecorder.onstop = () => {
                if (chunks.length === 0) {
                    alert('Recording failed: no data was captured. Please try again.');
                    setIsRecording(false);
                    setRecordingType(null);
                    return;
                }
                const finalType = chunks[0].type || supportedMimeType;
                const finalExt = finalType.includes('mp4') ? 'mp4' : 'webm';
                const blob = new Blob(chunks, { type: finalType });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `christmas-tree-${type.toLowerCase()}.${finalExt}`;
                link.click();
                setIsRecording(false);
                setRecordingType(null);
            };

            mediaRecorder.onerror = (e) => {
                console.error('MediaRecorder error:', e);
                alert('Recording failed to start. Please try again or use a modern browser.');
                setIsRecording(false);
                setRecordingType(null);
            };

            // Duration logic
            const duration = type === 'FULL' ? 10000 : Math.max(photos.length * 2500, 5000); // 10s for full, 2.5s per photo (min 5s)

            mediaRecorder.start();
            setTimeout(() => {
                mediaRecorder.stop();
            }, duration);
        });
    };

    return {
        isRecording,
        recordingType,
        handleRecordVideo
    };
};
