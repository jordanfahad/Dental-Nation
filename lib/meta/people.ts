/** Overlapping Meta action families describe the same people within an ad/day. */
export type MetaActions = { action_type: string; value: string }[] | undefined;
const act = (a: MetaActions, t: string) => Array.isArray(a)
  ? a.filter((x) => x.action_type === t).reduce((n, x) => n + (Number(x.value) || 0), 0) : 0;

export function metaPeople(actions: MetaActions): { gross: number; net: number; fresh: number } {
  const chats = act(actions, 'onsite_conversion.messaging_conversation_started_7d');
  const gross = Math.max(act(actions, 'lead'), chats, act(actions, 'onsite_conversion.total_messaging_connection'));
  if (!chats) return { gross, net: gross, fresh: gross };
  return {
    gross,
    net: Math.min(gross, act(actions, 'onsite_conversion.messaging_user_depth_2_message_send')),
    fresh: Math.min(gross, act(actions, 'onsite_conversion.messaging_first_reply')),
  };
}
