import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../api/axios';

export const fetchBatches = createAsyncThunk('batches/fetchAll', async () => {
  const res = await authApi.get('/batches');
  return res.data;
});

export const fetchBatch = createAsyncThunk('batches/fetchOne', async (id: string) => {
  const res = await authApi.get(`/batches/${id}`);
  return res.data;
});

const batchSlice = createSlice({
  name: 'batches',
  initialState: { list: [] as any[], current: null as any, loading: false },
  reducers: {
    clearCurrent(state) {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBatches.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBatches.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchBatches.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchBatch.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBatch.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(fetchBatch.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { clearCurrent } = batchSlice.actions;
export default batchSlice.reducer;
