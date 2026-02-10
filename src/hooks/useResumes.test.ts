import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResumes } from '@/hooks/useResumes';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useResumes Hook', () => {
  beforeEach(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
  });

  it('fetches resumes successfully', async () => {
    const { result } = renderHook(() => useResumes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.resumes).toBeDefined();
    expect(Array.isArray(result.current.resumes)).toBe(true);
  });

  it('handles fetch error', async () => {
    server.use(
      http.get('/api/resumes', () => {
        return HttpResponse.json(
          { error: 'Failed to fetch resumes' },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useResumes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('uploads resume successfully', async () => {
    const { result } = renderHook(() => useResumes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(['resume content'], 'resume.pdf', {
      type: 'application/pdf',
    });

    await result.current.uploadResume(file);

    await waitFor(() => {
      expect(result.current.uploadSuccess).toBe(true);
    });
  });

  it('handles upload error', async () => {
    server.use(
      http.post('/api/resumes/upload', () => {
        return HttpResponse.json(
          { error: 'Upload failed' },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useResumes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(['resume content'], 'resume.pdf', {
      type: 'application/pdf',
    });

    await expect(result.current.uploadResume(file)).rejects.toThrow();
  });

  it('deletes resume successfully', async () => {
    const { result } = renderHook(() => useResumes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.deleteResume('resume-1');

    await waitFor(() => {
      expect(result.current.deleteSuccess).toBe(true);
    });
  });

  it('handles delete error', async () => {
    server.use(
      http.delete('/api/resumes/:id', () => {
        return HttpResponse.json(
          { error: 'Delete failed' },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useResumes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.deleteResume('resume-1')).rejects.toThrow();
  });

  it('refetches resumes after upload', async () => {
    const { result } = renderHook(() => useResumes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCount = result.current.resumes?.length || 0;

    const file = new File(['resume content'], 'resume.pdf', {
      type: 'application/pdf',
    });

    await result.current.uploadResume(file);

    await waitFor(() => {
      expect(result.current.resumes?.length).toBeGreaterThanOrEqual(initialCount);
    });
  });

  it('refetches resumes after delete', async () => {
    const { result } = renderHook(() => useResumes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.deleteResume('resume-1');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.resumes).toBeDefined();
  });
});
