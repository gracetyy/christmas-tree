import { useState, useEffect } from 'react';

export const useVisitCounter = () => {
  const [visitCount, setVisitCount] = useState<number>(0);

  useEffect(() => {
    const updateAndFetchCount = async () => {
      try {
        const hasVisited = sessionStorage.getItem('has_visited_v6');

        // Call our serverless proxy on the same origin to avoid CORS and hide the API key
        const url = hasVisited ? '/api/counter' : '/api/counter';
        const method = hasVisited ? 'GET' : 'POST';

        const response = await fetch(url, { method });
        
        if (!response.ok) {
          throw new Error(`Counter Proxy error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Counter proxy returned:', data);

        // Flexibly extract a numeric count from various possible response shapes
        let count: number | null = null;

        if (data && typeof data.count === 'number') count = data.count;
        else if (data && typeof data.value === 'number') count = data.value;
        else if (data && typeof data.total === 'number') count = data.total;
        else if (data && typeof data.raw === 'string') {
          // Some services return a plain string (e.g., HTML/SVG); try to extract digits
          const match = data.raw.match(/(\d[\d,]*)/);
          if (match) count = parseInt(match[1].replace(/,/g, ''), 10);
        } else if (data && data.data && typeof data.data.count === 'number') {
          count = data.data.count;
        }

        if (count !== null) {
          setVisitCount(count);
          if (!hasVisited) {
            sessionStorage.setItem('has_visited_v6', 'true');
          }
        } else {
          console.warn('Unable to determine numeric visit count from response', data);
        }
      } catch (error) {
        console.error('Visit Counter Error:', error);
      }
    };

    updateAndFetchCount();
  }, []);

  return visitCount;
};
