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

        // Top-level fields
        if (data && typeof data.count === 'number') count = data.count;
        else if (data && typeof data.value === 'number') count = data.value;
        else if (data && typeof data.total === 'number') count = data.total;

        // Raw string response (e.g., SVG/HTML)
        else if (data && typeof data.raw === 'string') {
          const match = data.raw.match(/(\d[\d,]*)/);
          if (match) count = parseInt(match[1].replace(/,/g, ''), 10);
        }

        // Nested 'data' object used by CounterAPI v2
        else if (data && data.data) {
          const nested = data.data;
          if (typeof nested.count === 'number') count = nested.count;
          else if (typeof nested.up_count === 'number') count = nested.up_count;
          else if (typeof nested.value === 'number') count = nested.value;
          else if (typeof nested.total === 'number') count = nested.total;
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
