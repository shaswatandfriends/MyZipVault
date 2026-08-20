import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/notifications/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time notification push.
 *
 * How it works:
 *   1. Browser opens a connection via EventSource('/api/notifications/stream')
 *   2. Server holds the connection open and polls DB every 10 seconds
 *   3. When new unread notifications appear, server pushes them as SSE events
 *   4. Browser receives the event and updates the bell icon instantly
 *   5. When connection drops (Vercel ~30s limit), browser auto-reconnects
 *
 * Usage in browser:
 *   const es = new EventSource('/api/notifications/stream');
 *   es.onmessage = (e) => { const data = JSON.parse(e.data); ... };
 *   es.onerror = () => { es.close(); }; // auto-reconnects
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = Number((session.user as Record<string, unknown>).id);
  if (!userId) {
    return new Response("Invalid user", { status: 400 });
  }

  let lastUnreadCount = await db.notification.count({
    where: { user_id: userId, is_read: false },
  }).catch(() => 0);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection confirmation
      const initData = JSON.stringify({
        type: "connected",
        unreadCount: lastUnreadCount,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`data: ${initData}\n\n`));

      // Poll loop — check for new notifications every 10 seconds
      const pollInterval = setInterval(async () => {
        try {
          const currentUnread = await db.notification.count({
            where: { user_id: userId, is_read: false },
          }).catch(() => lastUnreadCount);

          if (currentUnread > lastUnreadCount) {
            const latest = await db.notification.findFirst({
              where: { user_id: userId, is_read: false },
              orderBy: { created_at: "desc" },
              take: 1,
            }).catch(() => null);

            const eventData = JSON.stringify({
              type: "notification",
              unreadCount: currentUnread,
              notification: latest ? {
                id: latest.id,
                title: latest.title,
                message: latest.message,
                category: latest.category,
                priority: latest.priority,
                action_url: latest.action_url,
                action_label: latest.action_label,
              } : null,
              timestamp: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
          }

          if (currentUnread < lastUnreadCount) {
            const eventData = JSON.stringify({
              type: "read_update",
              unreadCount: currentUnread,
              timestamp: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
          }

          lastUnreadCount = currentUnread;
        } catch {
          // Connection may be closing
        }
      }, 10000);

      // Heartbeat every 15 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
          clearInterval(pollInterval);
        }
      }, 15000);

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
