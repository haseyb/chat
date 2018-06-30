import { WebClient } from "@slack/client";
import { SlackUsers, SlackChannel, SlackMessage } from "../store/interfaces";

export default class SlackAPIClient {
  client: WebClient;

  constructor(token: string) {
    this.client = new WebClient(token);
  }

  getConversationHistory = (channel: string): Promise<SlackMessage[]> => {
    return this.client
      .apiCall("conversations.history", { channel, limit: 50 })
      .then((response: any) => {
        const { messages, ok } = response;

        if (ok) {
          return messages.map(message => ({
            userId: message.user,
            timestamp: message.ts,
            text: message.text
          }));
        }
      });
  };

  getAllUsers(): Promise<SlackUsers> {
    // TODO(arjun): This might need some pagination?
    return this.client.apiCall("users.list", {}).then((response: any) => {
      const { members, ok } = response;
      let users = {};

      if (ok) {
        members.forEach(member => {
          users[member.id] = {
            id: member.id,
            name: member.name,
            imageUrl: member.profile.image_72
          };
        });

        return users;
      }
    });
  }

  getChannels(users: SlackUsers): Promise<SlackChannel[]> {
    const channels = this.client
      .apiCall("channels.list", { exclude_archived: true })
      .then((response: any) => {
        const { ok, channels } = response;
        if (ok) {
          return channels.map(channel => ({
            id: channel.id,
            name: channel.name,
            type: "channel"
          }));
        }
      });
    const groups = this.client
      .apiCall("groups.list", { exclude_archived: true })
      .then((response: any) => {
        const { ok, groups } = response;
        if (ok) {
          // TODO(arjun): Handle is_mpim case, for private groups
          return groups.map(group => ({
            id: group.id,
            name: group.name,
            type: "group"
          }));
        }
      });
    const directs = this.client.apiCall("im.list", {}).then((response: any) => {
      const { ok, ims } = response;
      if (ok) {
        return ims.map(im => ({
          id: im.id,
          name: users[im.user].name,
          type: "im"
        }));
      }
    });
    return Promise.all([channels, groups, directs]).then(
      (values: SlackChannel[][]) => {
        return [].concat(...values);
      }
    );
  }

  sendMessage = ({ channel, text }): Promise<any> => {
    return this.client.chat.postMessage({
      channel,
      text,
      as_user: true
    });
  };
}