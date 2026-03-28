import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/axios';

interface AuthState {
  token: string | null;
  user: { id: string; email: string; name: string; role: string } | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = { token: null, user: null, loading: true, error: null };

export const login = createAsyncThunk('auth/login', async (creds: { email: string; password: string }, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', creds);
    localStorage.setItem('access_token', res.data.accessToken);
    localStorage.setItem('refresh_token', res.data.refreshToken);
    return res.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const restoreAuth = createAsyncThunk('auth/restore', async (_, { rejectWithValue }) => {
  const token = localStorage.getItem('access_token');
  if (!token) return rejectWithValue('No token');
  try {
    const res = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    return { accessToken: token, user: res.data };
  } catch {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return rejectWithValue('Token invalid');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.accessToken;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(restoreAuth.pending, (state) => { state.loading = true; })
      .addCase(restoreAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.accessToken;
        state.user = action.payload.user;
      })
      .addCase(restoreAuth.rejected, (state) => { state.loading = false; });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
