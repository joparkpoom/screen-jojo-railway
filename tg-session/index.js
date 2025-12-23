import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';

const apiId = 34718153;
const apiHash = '977389dee8221b1a32064f6c49aa8ab9';

const stringSession = new StringSession('');

const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5
});

(async () => {
  await client.start({
    phoneNumber: async () => input.text('📱 Phone (+66xxxx): '),
    password: async () => input.text('🔐 2FA (ถ้ามี): '),
    phoneCode: async () => input.text('📨 Code from Telegram: ')
  });

  console.log('\n===== COPY THIS =====\n');
  console.log(client.session.save());
  console.log('\n=====================\n');

  await client.disconnect();
})();