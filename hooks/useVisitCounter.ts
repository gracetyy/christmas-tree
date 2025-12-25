import { useState, useEffect } from 'react';

export const useVisitCounter = () => {
  const [visitCount, setVisitCount] = useState<number>(0);

  useEffect(() => {
    const updateAndFetchCount = async () => {
      try {
        // Check if we've already counted this session to avoid over-counting on refreshes
        const hasVisited = sessionStorage.getItem('has_visited_global');
        
        let url = 'https://api.counterapi.dev/v1/gracetyy-christmas-tree/visits';
        
        if (!hasVisited) {
          // Increment the count if it's a new session
          url += '/up';
          sessionStorage.setItem('has_visited_global', 'true');
        }

        const response = await fetch(url);
        const data = await response.json();
        
        if (data && data.count) {
          setVisitCount(data.count);
        }
      } catch (error) {
        console.error('Failed to fetch visit count:', error);
        // Fallback to local storage if API fails
        const storedCount = localStorage.getItem('visit_count');
        setVisitCount(storedCount ? parseInt(storedCount, 10) : 0);
      }
    };

    updateAndFetchCount();
  }, []);

  return visitCount;
};
