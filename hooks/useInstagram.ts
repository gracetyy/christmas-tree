import { useState } from 'react';
import { INSTAGRAM_WEBHOOK_URL } from '../constants';
import { PhotoData } from '../types';

export const useInstagram = (
    photos: PhotoData[],
    setPhotos: React.Dispatch<React.SetStateAction<PhotoData[]>>
) => {
    const [isInstaModalOpen, setIsInstaModalOpen] = useState(false);
    const [instaLoading, setInstaLoading] = useState(false);
    const [instaStatus, setInstaStatus] = useState('');

    const handleInstagramSubmit = async (username: string) => {
        setInstaLoading(true);
        setInstaStatus('Scraping Instagram Profile...');

        try {
            // 1. Call Webhook to Scrape & Process
            const response = await fetch(INSTAGRAM_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instagramUsername: username,
                    topXCount: photos.length
                })
            });

            const json = await response.json();

            if (json.success === false) {
                throw new Error(json.error || "Failed to process Instagram photos");
            }

            setInstaStatus('Processing Christmas Transformations...');

            // Parse new API format based on spec:
            // { success: true, data: { photos: [{ base64Data: "...", mimeType: "..." }, ...] } }
            const outputData = json.data;

            if (!outputData || !Array.isArray(outputData.photos)) {
                console.warn("Unexpected API Response structure:", json);
                throw new Error("API response did not contain a valid photos array.");
            }

            const receivedPhotos = outputData.photos;

            if (receivedPhotos.length === 0) {
                throw new Error(outputData.message || "No photos found for this user.");
            }

            setInstaStatus(`Hanging ${receivedPhotos.length} photos on the tree...`);

            // Convert to Data URIs
            const newImageUrls = receivedPhotos.map((p: any) => {
                if (p.base64Data && p.mimeType) {
                    return `data:${p.mimeType};base64,${p.base64Data}`;
                }
                return null;
            }).filter((u: string | null): u is string => !!u);

            if (newImageUrls.length === 0) {
                throw new Error("Failed to construct valid image data from response.");
            }

            // 2. Update Photos - Fill all available slots by looping through received images
            const newPhotos = [...photos];
            for (let i = 0; i < newPhotos.length; i++) {
                // Loop through the received images to fill all slots
                newPhotos[i].url = newImageUrls[i % newImageUrls.length];
            }
            setPhotos(newPhotos);
            setIsInstaModalOpen(false);

        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message}`);
        } finally {
            setInstaLoading(false);
            setInstaStatus('');
        }
    };

    return {
        isInstaModalOpen,
        setIsInstaModalOpen,
        instaLoading,
        instaStatus,
        handleInstagramSubmit
    };
};
