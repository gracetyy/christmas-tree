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
        
        // v2 API returns { count: number }
        if (data && typeof data.count === 'number') {
          setVisitCount(data.count);
          if (!hasVisited) {
            sessionStorage.setItem('has_visited_v6', 'true');
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
