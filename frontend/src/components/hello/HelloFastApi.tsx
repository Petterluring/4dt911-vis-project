import type { Message } from '../../interfaces/message';
import { useState } from 'react';
import fetchHelloFastAPI from '../../api/hello/hello_fast_api';

const failMessage: Message = { message: 'Failed to fetch hello message' };

function HelloFastApi() {
  const [message, setMessage] = useState<Message | null>(null);

  const handleClick = async () => {
    try {
      const data = await fetchHelloFastAPI();
      setMessage(data);
    } catch {
      setMessage(failMessage);
    }
  };

  return (
    <div>
      <button onClick={handleClick}>Fetch Hello from FastAPI</button>
      {message && <div>{message.message}</div>}
    </div>
  );
}

export default HelloFastApi;