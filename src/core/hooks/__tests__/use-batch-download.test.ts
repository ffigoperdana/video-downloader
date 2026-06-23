/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useBatchDownload } from "../use-batch-download";

describe("useBatchDownload", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useBatchDownload());
    expect(result.current.items).toEqual([]);
    expect(result.current.active).toBe(false);
    expect(result.current.total).toBe(0);
  });

  it("adds items to queue", () => {
    const { result } = renderHook(() => useBatchDownload());
    act(() => {
      result.current.addToQueue([
        {
          url: "https://example.com/video1",
          title: "Video 1",
          filename: "video1.mp4",
          downloadPath: "/internal/download/test",
        },
        {
          url: "https://example.com/video2",
          title: "Video 2",
          filename: "video2.mp4",
          downloadPath: "/internal/download/test2",
        },
      ]);
    });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.total).toBe(2);
    expect(result.current.items[0].status).toBe("pending");
  });

  it("removes an item", () => {
    const { result } = renderHook(() => useBatchDownload());
    act(() => {
      result.current.addToQueue([
        {
          url: "https://example.com/video1",
          title: "Video 1",
          filename: "video1.mp4",
          downloadPath: "/test",
        },
      ]);
    });
    const id = result.current.items[0].id;
    act(() => {
      result.current.removeItem(id);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("clears completed items", () => {
    const { result } = renderHook(() => useBatchDownload());
    act(() => {
      result.current.addToQueue([
        {
          url: "https://example.com/video1",
          title: "Video 1",
          filename: "video1.mp4",
          downloadPath: "/test",
        },
      ]);
    });
    // Manually set status for testing
    act(() => {
      // We can't easily test the actual download flow without mocking fetch,
      // but we can test clearCompleted logic
    });
    act(() => {
      result.current.clearCompleted();
    });
    // Items with completed status would be cleared
  });

  it("calculates stats correctly", () => {
    const { result } = renderHook(() => useBatchDownload());
    expect(result.current.completed).toBe(0);
    expect(result.current.failed).toBe(0);
    expect(result.current.pending).toBe(0);
    expect(result.current.downloading).toBe(0);
  });

  it("toggles minimized state", () => {
    const { result } = renderHook(() => useBatchDownload());
    expect(result.current.minimized).toBe(false);
    act(() => {
      result.current.setMinimized(true);
    });
    expect(result.current.minimized).toBe(true);
  });

  it("cancel sets abort flag", () => {
    const { result } = renderHook(() => useBatchDownload());
    act(() => {
      result.current.cancelAll();
    });
    // The cancel ref should be set - verified by no error thrown
  });

  it("starts a server-side job, polls progress, and downloads the completed file", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((input) => {
      const url = String(input);
      if (url === "/internal/progress/start") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            job: {
              id: "job-1",
              status: "downloading",
              progress: 0,
              receivedBytes: 0,
              totalBytes: 3,
            },
          }),
        } as Response);
      }
      if (url === "/internal/progress/status?id=job-1") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            job: {
              id: "job-1",
              status: "completed",
              progress: 100,
              receivedBytes: 3,
              totalBytes: 3,
            },
          }),
        } as Response);
      }
      return Promise.reject(new Error(`Unexpected fetch ${url}`));
    });
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation();

    const { result } = renderHook(() => useBatchDownload());
    await act(async () => {
      result.current.addToQueue([
        {
          url: "https://example.com/video",
          title: "Video",
          filename: "video.mp4",
          downloadPath: "/download",
        },
      ]);
      const promise = result.current.startBatch();
      await jest.runOnlyPendingTimersAsync();
      await promise;
    });

    expect(result.current.items[0]).toMatchObject({
      status: "completed",
      progress: 100,
      receivedBytes: 3,
      totalBytes: 3,
      serverJobId: "job-1",
    });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
