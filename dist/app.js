const agents = [
  {
    id: 'helper',
    name: '챗봇 에이전트',
    label: 'Helper',
    bot: 'cr72a_lunaflowhelper_s8W445',
    description: '질문하고 작업에 필요한 정보를 찾아보세요.',
  },
  {
    id: 'director',
    name: '동작 에이전트',
    label: 'Director',
    bot: 'cr72a_lunaflowdirector_lNkFk8',
    description: '캐릭터의 움직임과 장면 연출을 구체화하세요.',
  },
  {
    id: 'vfx',
    name: '이펙트 에이전트',
    label: 'VFX',
    bot: 'cr72a_lunaflowvfxagent_W3IOK5',
    description: '장면에 어울리는 시각 효과를 설계하고 발전시키세요.',
  },
];

const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
const agentIcon = (agent) => `<span class="agent-icon ${agent.id}">${icon(agent.id)}</span>`;
const home = document.getElementById('home');
const chat = document.getElementById('chat');
const chatSurface = document.getElementById('chat-surface');
const chatTitle = document.getElementById('chat-title');
let unmountChat;
let chatLoadRetry = 0;

document.getElementById('agent-nav').innerHTML = agents.map((agent) => `
  <a class="nav-link ${agent.id}" href="#${agent.id}" data-route="${agent.id}">${icon(agent.id)}<span>${agent.name}</span></a>
`).join('');

document.getElementById('agent-cards').innerHTML = agents.map((agent) => `
  <a class="card ${agent.id}" href="#${agent.id}">
    <div class="card-top">${agentIcon(agent)}<span class="agent-label">${agent.label}</span></div>
    <div class="card-copy">
      <h3>${agent.name}</h3>
      <p class="description">${agent.description}</p>
    </div>
    <span class="launch"><span class="launch-label">대화 시작</span>${icon('arrow')}</span>
  </a>
`).join('');

async function loadChat(host, agent, fallbackUrl, retry = false) {
  host.innerHTML = '<p class="chat-loading" role="status">대화 화면을 준비하는 중…</p>';
  const moduleUrl = new URL('/bundles/chat-runtime.js?v=__CHAT_VERSION__', location.origin);
  if (retry) moduleUrl.searchParams.set('retry', String(++chatLoadRetry));
  let timeout;

  try {
    const { mountChat } = await Promise.race([
      import(moduleUrl.href),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Chat loading timed out')), 20000);
      }),
    ]);
    if (host.isConnected) unmountChat = mountChat(host, agent, fallbackUrl);
  } catch {
    if (!host.isConnected) return;
    host.innerHTML = `
      <div class="native-conversation">
        <div class="connection-notice" role="status">
          <span>대화 화면을 불러오지 못해 Copilot Studio 채팅을 열었어요.</span>
          <button type="button">다시 연결</button>
        </div>
        <iframe class="fallback-chat"></iframe>
      </div>`;
    const iframe = host.querySelector('iframe');
    iframe.title = `${agent.name} Copilot Studio 채팅`;
    iframe.src = fallbackUrl;
    host.querySelector('button').addEventListener('click', () => loadChat(host, agent, fallbackUrl, true));
  } finally {
    clearTimeout(timeout);
  }
}

function showRoute(moveFocus = false) {
  unmountChat?.();
  unmountChat = undefined;
  chatSurface.replaceChildren();

  const agent = agents.find(({ id }) => location.hash === `#${id}`);
  const route = agent?.id ?? 'home';
  document.querySelectorAll('[data-route]').forEach((link) => {
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.getElementById('location').textContent = agent?.name ?? '에이전트 허브';
  document.title = agent ? `${agent.name} | LunaFlow Agent Studio` : 'LunaFlow Agent Studio';
  home.hidden = Boolean(agent);
  chat.hidden = !agent;

  if (agent) {
    const url = new URL(`https://copilotstudio.microsoft.com/environments/cfe472a7-8d6b-e57d-9381-81572ac35b9d/bots/${agent.bot}/webchat`);
    url.searchParams.set(agent.id === 'vfx' ? 'version' : '__version__', '2');
    url.searchParams.set('enableFileAttachment', 'false');
    url.searchParams.set('cliAgent', 'true');
    chatTitle.textContent = agent.name;
    document.getElementById('chat-icon').innerHTML = agentIcon(agent);
    document.getElementById('chat-description').textContent = agent.description;
    document.getElementById('external-chat').href = url.href;
    const host = document.createElement('div');
    host.className = 'chat-host';
    chatSurface.append(host);
    loadChat(host, agent, url.href);
  }

  if (moveFocus) {
    (agent ? chatTitle : home.querySelector('h1')).focus();
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', () => showRoute(true));
showRoute();
