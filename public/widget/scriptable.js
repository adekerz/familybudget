// FamilyBudget Widget for Scriptable
// Установка: скопировать в Scriptable → добавить виджет

const BASE_URL = 'https://familybudget-aa.vercel.app';
const TOKEN_KEY = 'familybudget_session';

const token = Keychain.contains(TOKEN_KEY) ? Keychain.get(TOKEN_KEY) : null;

if (!token) {
  const w = new ListWidget();
  const title = w.addText('⚙️ Откройте FamilyBudget');
  title.font = Font.boldSystemFont(14);
  const sub = w.addText('для настройки виджета');
  sub.font = Font.systemFont(12);
  Script.setWidget(w);
  Script.complete();
} else {
  const req = new Request(`${BASE_URL}/api/widget`);
  req.headers = { Authorization: `Bearer ${token}` };
  const data = await req.loadJSON();

  const w = new ListWidget();
  w.backgroundColor = new Color('#2274A5');
  w.url = BASE_URL;

  const label = w.addText('Безопасно потратить');
  label.textColor = new Color('#FFFFFF', 0.7);
  label.font = Font.systemFont(11);

  const amount = w.addText(`₸ ${(data.safeToSpend ?? 0).toLocaleString('ru-KZ')}`);
  amount.textColor = Color.white();
  amount.font = Font.boldSystemFont(24);

  w.addSpacer(6);

  const sub = w.addText(`На день: ₸ ${(data.dailyLimit ?? 0).toLocaleString('ru-KZ')}`);
  sub.textColor = new Color('#FFFFFF', 0.5);
  sub.font = Font.systemFont(11);

  const updated = w.addText(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
  updated.textColor = new Color('#FFFFFF', 0.3);
  updated.font = Font.systemFont(9);

  Script.setWidget(w);
  Script.complete();
}
