import React from 'react';
import { MessageFeed, MessageFeedProps } from '../MessageFeed';

export type MessageListProps = MessageFeedProps;

export const MessageList: React.FC<MessageListProps> = (props) => {
  return <MessageFeed {...props} />;
};

export default MessageList;
