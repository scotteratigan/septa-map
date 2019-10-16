import { useEffect, useState, useRef } from 'react';
const axios = require('axios');

export default function useLiveData() {
  const [data, setData] = useState([]);

  function updateData() {
    console.log('Updating vehicle positions...');
    axios
      .get('/septa')
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        console.error('error:', err);
      });
  }
  useInterval(updateData, 5000);
  return data;
}

function useInterval(callback, delay) {
  const savedCallback = useRef();
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
