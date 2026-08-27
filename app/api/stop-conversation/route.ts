import { NextResponse } from 'next/server';
import { StopConversationRequest } from '@/types/conversation';
import { takeAgentSession } from '@/app/api/agent-sessions';

export async function POST(request: Request) {
  try {
    const body: StopConversationRequest = await request.json();
    const { agent_id } = body;

    if (!agent_id) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400 },
      );
    }

    const session = takeAgentSession(agent_id);
    if (!session) {
      return NextResponse.json({ success: true, state: 'not-found' });
    }

    await session.stop();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error stopping conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to stop conversation',
      },
      { status: 500 },
    );
  }
}
