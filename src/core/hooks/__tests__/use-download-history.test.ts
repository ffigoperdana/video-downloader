/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useDownloadHistory } from "../use-download-history";

const mockEntry = {
  url: "https://youtube.com/watch?v=abc",
  platform: "youtube",
  title: "Test Video",
  thumbnail: "",
  quality: "720p",
  filename: "test.mp4",
  status: "completed" as const,
};

describe("useDownloadHistory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with empty entries", () => {
    const { result } = renderHook(() => useDownloadHistory());
    expect(result.current.entries).toEqual([]);
  });

  it("adds an entry", () => {
    const { result } = renderHook(() => useDownloadHistory());
    act(() => {
      result.current.addEntry(mockEntry);
    });
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].platform).toBe("youtube");
    expect(result.current.entries[0].title).toBe("Test Video");
    expect(result.current.entries[0].id).toBeDefined();
    expect(result.current.entries[0].timestamp).toBeGreaterThan(0);
  });

  it("removes an entry by id", () => {
    const { result } = renderHook(() => useDownloadHistory());
    act(() => {
      result.current.addEntry(mockEntry);
    });
    const id = result.current.entries[0].id;
    act(() => {
      result.current.removeEntry(id);
    });
    expect(result.current.entries).toHaveLength(0);
  });

  it("clears all history", () => {
    const { result } = renderHook(() => useDownloadHistory());
    act(() => {
      result.current.addEntry(mockEntry);
      result.current.addEntry({ ...mockEntry, title: "Video 2" });
    });
    expect(result.current.entries).toHaveLength(2);
    act(() => {
      result.current.clearHistory();
    });
    expect(result.current.entries).toHaveLength(0);
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useDownloadHistory());
    act(() => {
      result.current.addEntry(mockEntry);
    });
    const stored = JSON.parse(
      localStorage.getItem("saveit-download-history") ?? "[]",
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("Test Video");
  });

  it("limits to 100 entries (FIFO)", () => {
    const { result } = renderHook(() => useDownloadHistory());
    act(() => {
      for (let i = 0; i < 110; i++) {
        result.current.addEntry({ ...mockEntry, title: `Video ${i}` });
      }
    });
    expect(result.current.entries).toHaveLength(100);
    expect(result.current.entries[0].title).toBe("Video 109");
    expect(result.current.entries[99].title).toBe("Video 10");
  });

  it("loads existing entries from localStorage", () => {
    const existing = [
      { ...mockEntry, id: "existing-1", timestamp: Date.now() },
    ];
    localStorage.setItem(
      "saveit-download-history",
      JSON.stringify(existing),
    );
    const { result } = renderHook(() => useDownloadHistory());
    // Need to wait for useEffect hydration
    expect(result.current.hydrated).toBe(true);
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe("existing-1");
  });
});
