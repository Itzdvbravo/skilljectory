import { prisma } from '../../common/prisma.js';
import { NotFoundError } from '../../common/errors/app-error.js';

export class NotificationsService {
  static async getUnseen(userId: string) {
    const list = await prisma.notification.findMany({
      where: {
        user_id: userId,
        seen: false,
      },
      orderBy: { created_at: 'asc' },
    });

    return list.map((item) => ({
      id: item.id,
      type: item.type,
      referenceType: item.reference_type,
      referenceId: item.reference_id,
      title: item.title,
      body: item.body,
      seen: item.seen,
      createdAt: item.created_at.toISOString(),
    }));
  }

  static async ack(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        user_id: userId,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { seen: true },
    });
  }
}
