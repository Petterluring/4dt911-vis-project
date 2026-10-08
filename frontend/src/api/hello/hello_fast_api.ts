import type { Message } from '../../interfaces/message';

async function fetchHelloFastAPI(): Promise<Message> {
    const response = await fetch('/api/hello');

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    return response.json();
}

export default fetchHelloFastAPI;
