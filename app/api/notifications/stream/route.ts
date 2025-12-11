import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// Simple storage for connections
const connections: Record<string, any> = {};

const HEARTBEAT_INTERVAL = 25000; // 25 seconds

export async function GET(request: NextRequest) {
  console.log('🔔 SSE Connection attempt');
  
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return new Response('Server error', { status: 500 });
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    const userId = decoded.userId;
    
    console.log(`✅ SSE Connected for user: ${userId}`);

    // Clean up old connection
    if (connections[userId]) {
      try {
        if (connections[userId].heartbeat) {
          clearInterval(connections[userId].heartbeat);
        }
        connections[userId].controller.close();
      } catch (error) {
        // Ignore errors
      }
      delete connections[userId];
    }

    const stream = new ReadableStream({
      start(controller) {
        // Store connection
        connections[userId] = { controller };
        
        // Send welcome message
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connected',
          message: 'Real-time notifications connected',
          timestamp: new Date().toISOString()
        })}\n\n`));
        
        // Set up heartbeat
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`));
          } catch (error) {
            clearInterval(heartbeat);
            delete connections[userId];
          }
        }, HEARTBEAT_INTERVAL);
        
        connections[userId].heartbeat = heartbeat;
        
        // Cleanup on disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          delete connections[userId];
          console.log(`🔔 SSE Disconnected: ${userId}`);
        });
      },
      cancel() {
        if (connections[userId]?.heartbeat) {
          clearInterval(connections[userId].heartbeat);
        }
        delete connections[userId];
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error) {
    console.error('SSE Error:', error);
    return new Response('Unauthorized', { status: 401 });
  }
}

export function sendNotificationToUser(userId: string, notification: any): boolean {
  const connection = connections[userId];
  if (!connection) return false;

  try {
    const encoder = new TextEncoder();
    connection.controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'new_notification',
      notification,
      timestamp: new Date().toISOString()
    })}\n\n`));
    return true;
  } catch (error) {
    // Clean up broken connection
    if (connection.heartbeat) {
      clearInterval(connection.heartbeat);
    }
    delete connections[userId];
    return false;
  }
}