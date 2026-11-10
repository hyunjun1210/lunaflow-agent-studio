import { Components, createDirectLine, createStore } from 'botframework-webchat';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const { BasicWebChat, Composer } = Components;

const styleOptions = {
  accent: '#604cb0',
  backgroundColor: 'transparent',
  subtle: '#696471',
  primaryFont: '"Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
  botAvatarInitials: 'LF',
  botAvatarBackgroundColor: '#7058bd',
  avatarSize: 34,
  avatarBorderRadius: 11,
  bubbleBackground: '#fffefd',
  bubbleBorderColor: '#e7e2dc',
  bubbleBorderRadius: 17,
  bubbleTextColor: '#26232d',
  bubbleMessageMaxWidth: 620,
  bubbleFromUserBackground: '#eee9fa',
  bubbleFromUserBorderColor: '#eee9fa',
  bubbleFromUserBorderRadius: 17,
  bubbleFromUserTextColor: '#302644',
  hideUploadButton: true,
  sendBoxBackground: 'transparent',
  sendBoxBorderTop: 'none',
  sendBoxHeight: 58,
  sendBoxTextColor: '#26232d',
  sendBoxTextWrap: true,
  sendBoxPlaceholderColor: '#696471',
  sendBoxButtonColor: '#604cb0',
  sendBoxButtonColorOnHover: '#4f3b9d',
  sendBoxButtonShadeColorOnHover: '#eee9fa',
  sendBoxButtonShadeBorderRadius: 13,
  suggestedActionBackgroundColor: '#fffefd',
  suggestedActionBorderColor: '#dcd3ec',
  suggestedActionBorderRadius: 18,
  suggestedActionTextColor: '#5b499f',
};

function greetingStore() {
  let greeted = false;
  return createStore({}, ({ dispatch }) => (next) => (action) => {
    const result = next(action);
    if (action.type === 'DIRECT_LINE/CONNECT_FULFILLED' && !greeted) {
      greeted = true;
      dispatch({
        type: 'DIRECT_LINE/POST_ACTIVITY',
        meta: { method: 'keyboard' },
        payload: { activity: { type: 'event', name: 'startConversation', channelData: { postBack: true } } },
      });
    }
    return result;
  });
}

function Chat({ agent, fallbackUrl }) {
  const [chat, setChat] = useState(null);
  const [fallback, setFallback] = useState(false);
  const [status, setStatus] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let connection;
    let subscription;

    async function connect() {
      try {
        const response = await fetch('/api/direct-line/' + agent.id, {
          method: 'POST',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Token unavailable');
        const { token, domain } = await response.json();
        if (controller.signal.aborted) return;

        connection = createDirectLine({ token, domain });
        subscription = connection.connectionStatus$.subscribe(setStatus);
        setChat({ connection, store: greetingStore() });
      } catch {
        if (!controller.signal.aborted) setFallback(true);
      }
    }

    connect();
    return () => {
      controller.abort();
      subscription?.unsubscribe();
      connection?.end();
    };
  }, [agent, attempt]);

  function reconnect() {
    setChat(null);
    setStatus(0);
    setFallback(false);
    setAttempt((previous) => previous + 1);
  }

  if (fallback) {
    return (
      <div className="native-conversation">
        <div className="connection-notice" role="status">
          <span>Direct Line에 연결할 수 없어 Copilot Studio 채팅을 열었어요.</span>
          <button type="button" onClick={reconnect}>다시 연결</button>
        </div>
        <iframe className="fallback-chat" title={agent.name + ' Copilot Studio 채팅'} src={fallbackUrl} />
      </div>
    );
  }

  if (!chat) return <p className="chat-loading" role="status">에이전트에 연결하는 중…</p>;

  return (
    <div className="native-conversation">
      {(status === 3 || status === 4 || status === 5) && (
        <div className="connection-notice" role="status">
          <span>에이전트 연결이 끊어졌어요.</span>
          <button type="button" onClick={reconnect}>다시 연결</button>
        </div>
      )}
      <Composer directLine={chat.connection} store={chat.store} locale="ko-KR" styleOptions={styleOptions}>
        <BasicWebChat className="lunaflow-webchat" />
      </Composer>
    </div>
  );
}

export function mountChat(container, agent, fallbackUrl) {
  const root = createRoot(container);
  root.render(<Chat agent={agent} fallbackUrl={fallbackUrl} />);
  return () => root.unmount();
}
