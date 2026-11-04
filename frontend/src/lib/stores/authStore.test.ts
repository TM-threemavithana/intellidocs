import { useAuthStore } from './authStore';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('useAuthStore Unit Tests', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  it('should initialize with unauthenticated default state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('should clear authentication state on logout', () => {
    useAuthStore.setState({
      user: {
        id: 'usr-1',
        email: 'user@example.com',
        name: 'User',
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      token: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('should clear error on clearError()', () => {
    useAuthStore.setState({ error: 'Some network error' });
    expect(useAuthStore.getState().error).toBe('Some network error');

    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('should update state upon successful login', async () => {
    const mockUserData = {
      id: 'usr-42',
      email: 'test@example.com',
      name: 'Test Engineer',
      role: 'user',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'valid-access-jwt',
        refresh_token: 'valid-refresh-jwt',
        user: mockUserData,
      },
    });

    await useAuthStore.getState().login('test@example.com', 'SecurePass123!');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('valid-access-jwt');
    expect(state.refreshToken).toBe('valid-refresh-jwt');
    expect(state.user).toEqual(mockUserData);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });
});
