import { useState, useEffect } from 'react';

export const useVisitCounter = () => {
  const [visitCount, setVisitCount] = useState<number>(0);

  useEffect(() => {
    const updateAndFetchCount = async () => {
      try {
        const hasVisited = sessionStorage.getItem('has_visited_v5');
        const apiKey = import.meta.env.VITE_COUNTER_API_KEY;
        
        if (!apiKey) {
          console.warn('VITE_COUNTER_API_KEY is not set. Visit counter will not work.');
          return;
        }

        // Using your new v2 API endpoint
        const baseUrl = 'https://api.counterapi.dev/v2/gracetyy/christmas-tree';
        const url = hasVisited ? baseUrl : `${baseUrl}/up`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Counter API error: ${response.status}`);
        }

        const data = await response.json();
        
        // v2 API returns { count: number }
        if (data && typeof data.count === 'number') {
          setVisitCount(data.count);
          if (!hasVisited) {
            sessionStorage.setItem('has_visited_v5', 'true');
          }
        }
      } catch (error) {
        console.error('Visit Counter Error:', error);
      }
    };

    updateAndFetchCount();
  }, []);

  return visitCount;
};
