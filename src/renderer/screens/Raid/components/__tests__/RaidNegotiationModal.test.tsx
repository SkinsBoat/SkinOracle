// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { RaidAuditRow } from '../../../../../shared/types/raid.types';
import type { UseRaidPeerHostReturn } from '../../hooks/useRaidPeerHost';
import {
  applyPeerMessage,
  createNegotiationState,
} from '../../utils/negotiationState';
import { RaidNegotiationModal } from '../RaidNegotiationModal';

const { mockUseRaidPeerHost } = vi.hoisted(() => ({
  mockUseRaidPeerHost: vi.fn(),
}));

vi.mock('../../hooks/useRaidPeerHost', () => ({
  useRaidPeerHost: mockUseRaidPeerHost,
}));

vi.mock('react-hot-toast', () => {
  const toast = vi.fn() as unknown as {
    (message: string): void;
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

const seller = {
  marketplace: 'skinport' as const,
  id: 'seller-1',
  name: 'Seller One',
  url: 'https://skinport.com/shop/seller-1',
};

function auditRows(): RaidAuditRow[] {
  return [
    {
      item: {
        id: 'a',
        marketplace: 'skinport',
        marketHashName: 'AK-47 | Redline (Field-Tested)',
        price: 100,
        imageUrl: 'https://example.test/ak.png',
        exterior: 'Field-Tested',
        floatValue: 0.22,
      },
      ceiling: 80,
      status: 'raid',
    },
    {
      item: {
        id: 'b',
        marketplace: 'skinport',
        marketHashName: 'AWP | Asiimov (Field-Tested)',
        price: 50,
        imageUrl: 'https://example.test/awp.png',
        exterior: 'Field-Tested',
      },
      ceiling: 60,
      status: 'raid',
    },
  ];
}

function makeState() {
  return createNegotiationState({
    roomId: '8f3a9b1c-1111-4222-8333-444455556666',
    marketplace: 'skinport',
    sellerHandle: 'Seller One',
    rows: auditRows(),
    now: 1000,
  });
}

function makeSession(
  overrides: Partial<UseRaidPeerHostReturn> = {},
): UseRaidPeerHostReturn {
  const state = makeState();
  return {
    roomId: state.roomId,
    shareUrl: `https://skinsboat.com/deal#room=${state.roomId}&token=guest-token`,
    guestToken: 'guest-token',
    remainingBalanceCents: 980,
    sessionExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    billingError: null,
    status: 'connected',
    transportMode: 'p2p',
    peerRegistered: true,
    linkReady: true,
    error: null,
    guestConnected: true,
    latencyMs: 12,
    state,
    chat: [],
    start: vi.fn(),
    stop: vi.fn(),
    resync: vi.fn(),
    toggleItem: vi.fn(),
    setItemsSelected: vi.fn(),
    setGlobalDiscount: vi.fn(),
    setItemCounter: vi.fn(),
    setItemCounters: vi.fn(),
    acceptCounter: vi.fn(),
    acceptCounters: vi.fn(),
    declineCounter: vi.fn(),
    declineCounters: vi.fn(),
    setReady: vi.fn(),
    lockDeal: vi.fn(),
    sendChat: vi.fn(),
    ...overrides,
  };
}

describe('RaidNegotiationModal', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    mockUseRaidPeerHost.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the live table, public prices, and peer status', async () => {
    mockUseRaidPeerHost.mockReturnValue(makeSession());

    render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Live Negotiation Table' }),
    ).toBeTruthy();
    expect(screen.getByText(/Live P2P Connected/)).toBeTruthy();
    expect(screen.getByText('Seller One · Skinport')).toBeTruthy();
    expect(
      screen.getByText('AK-47 | Redline (Field-Tested)'),
    ).toBeTruthy();
    expect(screen.getByText('Base $100.00')).toBeTruthy();
    expect(screen.getByText('Offer $80.00')).toBeTruthy();

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('#room='),
      );
    });
  });

  it('toggles inclusion and updates the global discount', () => {
    const session = makeSession();
    mockUseRaidPeerHost.mockReturnValue(session);

    render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByLabelText('Include AK-47 | Redline (Field-Tested)'),
    );
    expect(session.toggleItem).toHaveBeenCalledWith('skinport:a', false);

    fireEvent.change(screen.getByLabelText('Bundle price adjustment'), {
      target: { value: '10' },
    });
    expect(session.setGlobalDiscount).toHaveBeenCalledWith(10);
  });

  it('accepts and declines seller counter-offers', () => {
    const session = makeSession();
    const countered = applyPeerMessage(
      session.state,
      {
        type: 'SET_ITEM_COUNTER',
        itemId: 'skinport:a',
        counterPrice: 76.5,
      },
      'seller',
    );
    session.state = countered;
    mockUseRaidPeerHost.mockReturnValue(session);

    render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Counter $76.50')).toBeTruthy();

    fireEvent.click(
      screen.getByTitle("Accept the seller's counter-offer"),
    );
    expect(session.acceptCounter).toHaveBeenCalledWith('skinport:a');

    fireEvent.click(
      screen.getByTitle('Decline the counter and keep the original offer'),
    );
    expect(session.declineCounter).toHaveBeenCalledWith('skinport:a');
  });

  it('shows the offline-interactive fallback banner', () => {
    mockUseRaidPeerHost.mockReturnValue(
      makeSession({
        transportMode: 'offline',
        guestConnected: false,
        latencyMs: null,
      }),
    );

    render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        'Live sync unavailable. The seller needs the live channel to receive the deal; local controls remain active.',
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Offline Interactive/)).toBeTruthy();
    expect(
      screen.getByPlaceholderText('Chat requires a live P2P channel'),
    ).toBeTruthy();
  });

  it('marks the trader ready and locks the deal', () => {
    const session = makeSession();
    session.state = {
      ...session.state,
      traderReady: true,
      sellerReady: true,
    };
    mockUseRaidPeerHost.mockReturnValue(session);

    render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Withdraw Ready'));
    expect(session.setReady).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByText('Lock Deal'));
    expect(session.lockDeal).toHaveBeenCalled();
  });

  it('sends activity-feed messages over the live channel', () => {
    const session = makeSession({
      chat: [
        {
          id: 'chat-1',
          role: 'seller',
          sender: 'Seller One',
          text: 'Can you do $78 on the AK?',
          timestamp: 1000,
        },
      ],
    });
    mockUseRaidPeerHost.mockReturnValue(session);

    render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Can you do $78 on the AK?')).toBeTruthy();

    const input = screen.getByLabelText('Negotiation message');
    fireEvent.change(input, { target: { value: 'Meet me at $77.50.' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(session.sendChat).toHaveBeenCalledWith('Meet me at $77.50.');
  });

  it('copies the share link on demand', async () => {
    const session = makeSession();
    mockUseRaidPeerHost.mockReturnValue(session);

    render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Copy Link'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        session.shareUrl,
      );
    });
  });

  it('renders the insufficient-balance Top Up prompt', () => {
    const onTopUp = vi.fn();
    mockUseRaidPeerHost.mockReturnValue(
      makeSession({
        status: 'error',
        transportMode: 'offline',
        shareUrl: null,
        guestToken: null,
        remainingBalanceCents: null,
        linkReady: false,
        billingError: {
          success: false,
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance',
          requiredCents: 20,
          balanceCents: 5,
        },
      }),
    );

    render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={vi.fn()}
        onClose={vi.fn()}
        onTopUp={onTopUp}
      />,
    );

    expect(screen.getByText('Insufficient balance')).toBeTruthy();
    expect(screen.getByText(/Available: \$0\.05/)).toBeTruthy();

    fireEvent.click(screen.getByText('Top Up Balance'));
    expect(onTopUp).toHaveBeenCalled();
  });

  it('stacks identical listings and applies the group checkbox to all', () => {
    const session = makeSession();
    const sharedName = session.state.items[0].marketHashName;
    session.state = {
      ...session.state,
      items: session.state.items.map((item, index) =>
        index === 1 ? { ...item, marketHashName: sharedName } : item,
      ),
    };
    mockUseRaidPeerHost.mockReturnValue(session);

    render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('×2')).toBeTruthy();
    expect(screen.getByText('2 listings')).toBeTruthy();

    fireEvent.click(screen.getByLabelText(`Include all ${sharedName}`));
    expect(session.setItemsSelected).toHaveBeenCalledWith(
      ['skinport:a', 'skinport:b'],
      false,
    );
  });

  it('accepts every counter in a stack with one action', () => {
    const session = makeSession();
    const sharedName = session.state.items[0].marketHashName;
    session.state = {
      ...session.state,
      items: session.state.items.map((item) => ({
        ...item,
        marketHashName: sharedName,
        counterPrice: 75,
      })),
    };
    mockUseRaidPeerHost.mockReturnValue(session);

    render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Accept all'));
    expect(session.acceptCounters).toHaveBeenCalledWith([
      'skinport:a',
      'skinport:b',
    ]);
  });

  it('hides without unmounting the live session and can end explicitly', () => {
    const onEndSession = vi.fn();
    const session = makeSession();
    mockUseRaidPeerHost.mockReturnValue(session);

    const { rerender } = render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={onEndSession}
        onClose={vi.fn()}
      />,
    );

    rerender(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen={false}
        onEndSession={onEndSession}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('heading', { name: 'Live Negotiation Table' }),
    ).toBeNull();
    expect(mockUseRaidPeerHost).toHaveBeenCalled();

    rerender(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={onEndSession}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('End Session'));
    expect(onEndSession).toHaveBeenCalled();
  });

  it('exports locked deal data to PDF without internal fields', async () => {
    const exportNegotiationDeal = vi
      .fn()
      .mockResolvedValue({ canceled: false, filePath: '/tmp/deal.pdf' });
    (window as any).electronAPI = {
      raid: { exportNegotiationDeal },
    };

    const session = makeSession();
    session.state = {
      ...session.state,
      dealLocked: true,
      traderReady: true,
      sellerReady: true,
      items: session.state.items.map((item) => ({
        ...item,
        status: 'accepted',
      })),
    };
    mockUseRaidPeerHost.mockReturnValue(session);

    render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Export PDF'));

    await waitFor(() => {
      expect(exportNegotiationDeal).toHaveBeenCalledTimes(1);
    });

    const payload = exportNegotiationDeal.mock.calls[0][0];
    expect(payload).toMatchObject({
      roomId: session.state.roomId,
      dealLocked: true,
      traderReady: true,
      sellerReady: true,
    });
    expect(payload.items).toHaveLength(2);
    expect(JSON.stringify(payload)).not.toContain('ceiling');
    expect(JSON.stringify(payload)).not.toContain('profitPercent');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    mockUseRaidPeerHost.mockReturnValue(makeSession());

    render(
      <RaidNegotiationModal
        seller={seller}
        rows={auditRows()}
        sessionIdempotencyKey="test-session-key"
        isOpen
        onEndSession={vi.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
