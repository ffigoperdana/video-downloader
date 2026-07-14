/** @jest-environment jsdom */

import { useState } from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SmartUrlInput from "@/components/smart-url-input";

function InputHarness() {
  const [value, setValue] = useState("");

  return (
    <SmartUrlInput
      platformName="TikTok"
      placeholder="Paste TikTok URL..."
      value={value}
      onValueChange={setValue}
      onFetch={jest.fn()}
      disabled={false}
      fetching={false}
      glowClassName="from-pink-500/10 to-cyan-500/10"
      focusBorderClassName="group-focus-within:border-pink-500/30"
      fetchButtonClassName="bg-pink-500 text-white"
    />
  );
}

describe("SmartUrlInput", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
  });

  it("pastes a URL and changes its secondary action to Clear", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: jest.fn().mockResolvedValue(" https://www.tiktok.com/@user/video/1 "),
      },
    });

    render(<InputHarness />);

    expect(
      screen.getByRole("button", { name: "Paste TikTok URL from clipboard" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Fetch TikTok media" }).hasAttribute("disabled"),
    ).toBe(true);

    fireEvent.click(
      screen.getByRole("button", { name: "Paste TikTok URL from clipboard" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Clear TikTok URL and result" }),
      ).toBeTruthy();
    });
    expect(screen.getByRole("textbox")).toHaveValue(
      "https://www.tiktok.com/@user/video/1",
    );
  });

  it("clears a manually entered URL", () => {
    render(<InputHarness />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "https://www.tiktok.com/@user/video/1" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Clear TikTok URL and result" }),
    );

    expect(input).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Paste TikTok URL from clipboard" }),
    ).toBeTruthy();
  });

  it("explains when clipboard access is unavailable", async () => {
    render(<InputHarness />);

    fireEvent.click(
      screen.getByRole("button", { name: "Paste TikTok URL from clipboard" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Clipboard access is unavailable",
    );
  });
});
