export function normalizeZohoEvent(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const { event_type: eventType, data } = payload;

  if (!eventType || !data || typeof data !== 'object') {
    return null;
  }

  if (eventType === 'message_created') {
    const message = data.message;

    if (!message || typeof message !== 'object') {
      return null;
    }

    const {
      id,
      space_id: spaceId,
      sender,
      mentions,
      replied_to: repliedTo,
      posted_time: postedTime,
    } = message;

    if (!id || !spaceId || !sender || !sender.id || !postedTime) {
      return null;
    }

    const normalizedMentions = Array.isArray(mentions)
      ? mentions
          .map((m) => m && m.id)
          .filter((v) => typeof v === 'string' && v.length > 0)
      : [];

    const repliesTo = repliedTo && repliedTo.id ? String(repliedTo.id) : null;

    return {
      message_id: String(id),
      channel_id: String(spaceId),
      sender_id: String(sender.id),
      mentions: normalizedMentions.map((m) => String(m)),
      replies_to: repliesTo,
      reactions: [],
      timestamp: String(postedTime),
    };
  }

  if (eventType === 'reaction_added') {
    const {
      message_id: messageId,
      emoji,
      user,
      space_id: spaceId,
      time,
    } = data;

    if (!messageId || !emoji || !user || !user.id || !spaceId || !time) {
      return null;
    }

    return {
      message_id: String(messageId),
      channel_id: String(spaceId),
      sender_id: null,
      mentions: [],
      replies_to: null,
      reactions: [
        {
          user_id: String(user.id),
          emoji: String(emoji),
        },
      ],
      timestamp: String(time),
    };
  }

  return null;
}
