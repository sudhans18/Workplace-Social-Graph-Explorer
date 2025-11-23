import { messages } from '../store/messagesStore.js';
import { log } from '../utils/logger.js';

/**
 * Clear all messages from the store
 * @returns {number} Number of messages cleared
 */
export function clearMessagesStore() {
  const count = messages.length;
  messages.length = 0;
  log('Demo seeder: cleared messages store', { count });
  return count;
}

/**
 * List available demo scenarios
 * @returns {string[]} Array of scenario names
 */
export function listAvailableScenarios() {
  return ['healthy', 'siloed', 'overloaded'];
}

/**
 * Generate a random message ID
 * @returns {string} Message ID
 */
function generateMessageId() {
  return `demo_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a timestamp within the last N days
 * @param {number} daysAgo - Number of days ago (0 = today)
 * @returns {string} Timestamp string (Unix seconds)
 */
function generateTimestamp(daysAgo = 0) {
  const now = Date.now();
  const msAgo = daysAgo * 24 * 60 * 60 * 1000;
  const randomOffset = Math.random() * 24 * 60 * 60 * 1000; // Random time within the day
  const timestamp = now - msAgo - randomOffset;
  // Return as Unix seconds (since Zoho typically uses seconds)
  return String(Math.floor(timestamp / 1000));
}

/**
 * Seed the "healthy" scenario
 * Well-connected org with good cross-team links
 * @returns {Object} Summary of seeded data
 */
function seedHealthyScenario() {
  const users = ['alice', 'bob', 'charlie', 'diana', 'eve', 'frank', 'grace', 'henry', 'ivy', 'jack'];
  const channels = ['general', 'team_sales', 'team_eng'];
  const seededMessages = [];
  
  // Create a well-connected pattern
  // Each user interacts with multiple others across channels
  for (let i = 0; i < 60; i++) {
    const sender = users[Math.floor(Math.random() * users.length)];
    const channel = channels[Math.floor(Math.random() * channels.length)];
    
    // 40% chance of mentions (high interaction)
    const mentions = Math.random() < 0.4 
      ? [users[Math.floor(Math.random() * users.length)]].filter(u => u !== sender)
      : [];
    
    // 30% chance of reactions
    const reactions = Math.random() < 0.3
      ? [{ user_id: users[Math.floor(Math.random() * users.length)], emoji: '👍' }]
      : [];
    
    seededMessages.push({
      message_id: generateMessageId(),
      channel_id: channel,
      sender_id: sender,
      mentions: mentions,
      replies_to: null,
      reactions: reactions,
      timestamp: generateTimestamp(Math.floor(Math.random() * 3)), // Within last 3 days
    });
  }
  
  // Add some cross-channel conversations
  for (let i = 0; i < 20; i++) {
    const sender = users[Math.floor(Math.random() * users.length)];
    const targetChannel = channels[Math.floor(Math.random() * channels.length)];
    const mentionedUser = users[Math.floor(Math.random() * users.length)];
    
    if (sender !== mentionedUser) {
      seededMessages.push({
        message_id: generateMessageId(),
        channel_id: targetChannel,
        sender_id: sender,
        mentions: [mentionedUser],
        replies_to: null,
        reactions: [],
        timestamp: generateTimestamp(Math.floor(Math.random() * 2)),
      });
    }
  }
  
  messages.push(...seededMessages);
  
  log('Demo seeder: seeded healthy scenario', {
    messageCount: seededMessages.length,
    users: users.length,
    channels: channels.length,
  });
  
  return {
    scenario: 'healthy',
    messageCount: seededMessages.length,
    users,
    channels,
  };
}

/**
 * Seed the "siloed" scenario
 * 2-3 strong clusters with weak links between them
 * @returns {Object} Summary of seeded data
 */
function seedSiloedScenario() {
  // Cluster A: sales team
  const clusterA = ['alice', 'bob', 'charlie', 'diana'];
  const channelA = 'sales';
  
  // Cluster B: engineering team
  const clusterB = ['eve', 'frank', 'grace', 'henry'];
  const channelB = 'engineering';
  
  // Cluster C: marketing team
  const clusterC = ['ivy', 'jack', 'kate', 'lucas'];
  const channelC = 'marketing';
  
  const allUsers = [...clusterA, ...clusterB, ...clusterC];
  const channels = [channelA, channelB, channelC];
  const seededMessages = [];
  
  // High density within each cluster (80 messages per cluster = 240 total)
  [clusterA, clusterB, clusterC].forEach((cluster, clusterIdx) => {
    const channel = channels[clusterIdx];
    
    for (let i = 0; i < 80; i++) {
      const sender = cluster[Math.floor(Math.random() * cluster.length)];
      // High chance of mentioning someone in same cluster
      const mentioned = Math.random() < 0.5
        ? cluster[Math.floor(Math.random() * cluster.length)]
        : null;
      
      seededMessages.push({
        message_id: generateMessageId(),
        channel_id: channel,
        sender_id: sender,
        mentions: mentioned && mentioned !== sender ? [mentioned] : [],
        replies_to: null,
        reactions: Math.random() < 0.3
          ? [{ user_id: cluster[Math.floor(Math.random() * cluster.length)], emoji: '👍' }]
          : [],
        timestamp: generateTimestamp(Math.floor(Math.random() * 4)),
      });
    }
  });
  
  // Very few cross-cluster interactions (only 5 bridge messages)
  const bridgeUsers = [clusterA[0], clusterB[0]]; // alice and eve act as bridges
  
  for (let i = 0; i < 5; i++) {
    const bridge = bridgeUsers[Math.floor(Math.random() * bridgeUsers.length)];
    let targetCluster, targetChannel;
    
    if (bridge === clusterA[0]) {
      // Bridge to cluster B
      targetCluster = clusterB;
      targetChannel = channelB;
    } else {
      // Bridge to cluster A
      targetCluster = clusterA;
      targetChannel = channelA;
    }
    
    const mentioned = targetCluster[Math.floor(Math.random() * targetCluster.length)];
    
    seededMessages.push({
      message_id: generateMessageId(),
      channel_id: targetChannel,
      sender_id: bridge,
      mentions: [mentioned],
      replies_to: null,
      reactions: [],
      timestamp: generateTimestamp(Math.floor(Math.random() * 4)),
    });
  }
  
  messages.push(...seededMessages);
  
  log('Demo seeder: seeded siloed scenario', {
    messageCount: seededMessages.length,
    users: allUsers.length,
    channels: channels.length,
    clusters: 3,
  });
  
  return {
    scenario: 'siloed',
    messageCount: seededMessages.length,
    users: allUsers,
    channels,
  };
}

/**
 * Seed the "overloaded" scenario
 * One user acts as a heavy bottleneck/connector
 * @returns {Object} Summary of seeded data
 */
function seedOverloadedScenario() {
  const users = ['alex', 'bob', 'charlie', 'diana', 'eve', 'frank', 'grace'];
  const hub = 'alex'; // The overloaded connector
  const channels = ['general', 'team_discussions'];
  const seededMessages = [];
  
  // alex sends many messages mentioning others (30 messages)
  for (let i = 0; i < 30; i++) {
    const target = users[Math.floor(Math.random() * users.length)];
    if (target !== hub) {
      seededMessages.push({
        message_id: generateMessageId(),
        channel_id: channels[Math.floor(Math.random() * channels.length)],
        sender_id: hub,
        mentions: [target],
        replies_to: null,
        reactions: [],
        timestamp: generateTimestamp(Math.floor(Math.random() * 3)),
      });
    }
  }
  
  // Others reply to alex or mention alex (20 messages)
  for (let i = 0; i < 20; i++) {
    const sender = users[Math.floor(Math.random() * users.length)];
    if (sender !== hub) {
      seededMessages.push({
        message_id: generateMessageId(),
        channel_id: channels[Math.floor(Math.random() * channels.length)],
        sender_id: sender,
        mentions: [hub],
        replies_to: null,
        reactions: [],
        timestamp: generateTimestamp(Math.floor(Math.random() * 3)),
      });
    }
  }
  
  // Create messages from alex that receive many reactions
  // This makes alex the hub - everyone reacts to alex's messages
  const otherUsers = users.filter(u => u !== hub);
  
  for (let i = 0; i < 25; i++) {
    // Some messages get multiple reactions (making alex more central)
    const numReactions = Math.random() < 0.3 ? 2 : 1;
    const reactors = [];
    for (let j = 0; j < numReactions && j < otherUsers.length; j++) {
      const reactor = otherUsers[Math.floor(Math.random() * otherUsers.length)];
      if (!reactors.includes(reactor)) {
        reactors.push(reactor);
      }
    }
    
    seededMessages.push({
      message_id: generateMessageId(),
      channel_id: channels[Math.floor(Math.random() * channels.length)],
      sender_id: hub, // Message from alex
      mentions: [],
      replies_to: null,
      reactions: reactors.map(reactor => ({ user_id: reactor, emoji: '👍' })),
      timestamp: generateTimestamp(Math.floor(Math.random() * 3)),
    });
  }
  
  // Very few direct interactions between others (only 5 messages)
  for (let i = 0; i < 5; i++) {
    const sender = users.filter(u => u !== hub)[Math.floor(Math.random() * (users.length - 1))];
    const receivers = users.filter(u => u !== hub && u !== sender);
    const mentioned = receivers[Math.floor(Math.random() * receivers.length)];
    
    seededMessages.push({
      message_id: generateMessageId(),
      channel_id: channels[Math.floor(Math.random() * channels.length)],
      sender_id: sender,
      mentions: [mentioned],
      replies_to: null,
      reactions: [],
      timestamp: generateTimestamp(Math.floor(Math.random() * 3)),
    });
  }
  
  messages.push(...seededMessages);
  
  log('Demo seeder: seeded overloaded scenario', {
    messageCount: seededMessages.length,
    users: users.length,
    channels: channels.length,
    hubUser: hub,
  });
  
  return {
    scenario: 'overloaded',
    messageCount: seededMessages.length,
    users,
    channels,
    hubUser: hub,
  };
}

/**
 * Seed a demo scenario by name
 * @param {string} scenarioName - Name of the scenario to seed
 * @returns {Object} Summary of seeded data
 * @throws {Error} If scenario name is unknown
 */
export function seedDemoScenario(scenarioName) {
  const normalizedName = (scenarioName || '').toLowerCase().trim();
  
  switch (normalizedName) {
    case 'healthy':
      return seedHealthyScenario();
    
    case 'siloed':
      return seedSiloedScenario();
    
    case 'overloaded':
      return seedOverloadedScenario();
    
    default:
      throw new Error(`Unknown scenario: ${scenarioName}. Available scenarios: ${listAvailableScenarios().join(', ')}`);
  }
}

