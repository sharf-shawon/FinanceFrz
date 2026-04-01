// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Hoisted mock factories (must be before vi.mock calls)
// ---------------------------------------------------------------------------
const { mockToPng } = vi.hoisted(() => ({
  mockToPng: vi.fn(),
}));

const { MockJsPDF, mockJsPdfAddImage, mockJsPdfSave } = vi.hoisted(() => {
  const mockJsPdfAddImage = vi.fn();
  const mockJsPdfSave = vi.fn();
  // Must use a regular function (not arrow) so `new MockJsPDF()` works correctly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockJsPDF = vi.fn(function (this: any) {
    this.addImage = mockJsPdfAddImage;
    this.save = mockJsPdfSave;
  });
  return { MockJsPDF, mockJsPdfAddImage, mockJsPdfSave };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/daily-logs"),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("html-to-image", () => ({ toPng: mockToPng }));
vi.mock("jspdf", () => ({ jsPDF: MockJsPDF }));

// Mock Radix UI DropdownMenu so items are always visible without pointer-event gymnastics
vi.mock("@/components/ui/dropdown-menu", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "dropdown-content" }, children),
    DropdownMenuItem: ({
      children,
      onClick,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
    }) => React.createElement("button", { type: "button", onClick }, children),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeOkResponse = (body: unknown) => ({ ok: true, json: async () => body });
const emptyDayData = { transactions: [], previousBalance: 1000, suggestions: [] };

function setupImageMock(width = 800, height = 600) {
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: ((e: Event) => void) | null = null;
    width = width;
    height = height;
    private _src = "";
    set src(v: string) {
      this._src = v;
      queueMicrotask(() => this.onload?.());
    }
    get src() { return this._src; }
  }
  vi.stubGlobal("Image", FakeImage);
}

async function waitForLoad() {
  await waitFor(() => {
    expect(screen.queryByText("common.loading")).not.toBeInTheDocument();
  });
}

async function makeDirty() {
  const rateInputs = screen.getAllByLabelText(/income row 1 rate/i);
  fireEvent.change(rateInputs[0], { target: { value: "50" } });
  await screen.findByTestId("unsaved-banner");
}

// ---------------------------------------------------------------------------
// Setup & teardown
// ---------------------------------------------------------------------------
import DailyLogsPage from "@/app/(dashboard)/daily-logs/page";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setupImageMock();
  mockToPng.mockResolvedValue("data:image/png;base64,fakedata");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeOkResponse(emptyDayData)));
});

afterEach(() => {
  // Always clean up the dark class so tests don't bleed into each other
  document.documentElement.classList.remove("dark");
});

// ===========================================================================
// Export branding header & footer
// ===========================================================================
describe("DailyLogsPage – export branding elements", () => {
  it("export header is hidden by default", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByTestId("export-header").style.display).toBe("none");
  });

  it("export footer is hidden by default", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByTestId("export-footer").style.display).toBe("none");
  });

  it("export header contains the FinanceFrz brand name", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByTestId("export-header").textContent).toContain("FinanceFrz");
  });

  it("export header contains 'Daily Financial Log' subtitle", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByTestId("export-header").textContent).toContain("Daily Financial Log");
  });

  it("export header contains the logo img element", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    const logo = screen.getByTestId("export-header").querySelector("img");
    expect(logo).not.toBeNull();
    expect(logo?.getAttribute("src")).toContain("apple-icon");
  });

  it("export footer is present in the DOM", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByTestId("export-footer")).toBeInTheDocument();
  });

  it("export footer contains FinanceFrz branding text", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByTestId("export-footer").textContent).toContain("FinanceFrz");
  });
});

// ===========================================================================
// PNG export – clean state
// ===========================================================================
describe("DailyLogsPage – PNG export (no unsaved changes)", () => {
  it("calls toPng when PNG export item is clicked", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await waitFor(() => expect(mockToPng).toHaveBeenCalledTimes(1));
  });

  it("export header is visible while toPng is running", async () => {
    let headerVisible = false;
    mockToPng.mockImplementation(async (node: HTMLElement) => {
      const header = node.querySelector("[data-testid='export-header']") as HTMLElement | null;
      headerVisible = header !== null && header.style.display !== "none";
      return "data:image/png;base64,fakedata";
    });
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await waitFor(() => expect(mockToPng).toHaveBeenCalled());
    expect(headerVisible).toBe(true);
  });

  it("export footer is visible while toPng is running", async () => {
    let footerVisible = false;
    mockToPng.mockImplementation(async (node: HTMLElement) => {
      const footer = node.querySelector("[data-testid='export-footer']") as HTMLElement | null;
      footerVisible = footer !== null && footer.style.display !== "none";
      return "data:image/png;base64,fakedata";
    });
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await waitFor(() => expect(mockToPng).toHaveBeenCalled());
    expect(footerVisible).toBe(true);
  });

  it("export header is hidden again after PNG export completes", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await waitFor(() => expect(mockToPng).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("export-header").style.display).toBe("none"));
  });

  it("export footer is hidden again after PNG export completes", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await waitFor(() => expect(mockToPng).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("export-footer").style.display).toBe("none"));
  });

  it("shows export error when toPng throws", async () => {
    mockToPng.mockRejectedValueOnce(new Error("canvas failure"));
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await screen.findByTestId("export-error");
  });

  it("applies 32px padding during capture", async () => {
    let paddingDuringCapture: string | undefined;
    mockToPng.mockImplementation(async (node: HTMLElement) => {
      paddingDuringCapture = node.style.padding;
      return "data:image/png;base64,fakedata";
    });
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await waitFor(() => expect(mockToPng).toHaveBeenCalled());
    expect(paddingDuringCapture).toBe("32px");
  });
});

// ===========================================================================
// PDF export – clean state
// ===========================================================================
describe("DailyLogsPage – PDF export (no unsaved changes)", () => {
  it("calls toPng and jsPDF when PDF export item is clicked", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPdf"));
    await waitFor(() => expect(MockJsPDF).toHaveBeenCalledTimes(1));
    expect(mockJsPdfAddImage).toHaveBeenCalledTimes(1);
    expect(mockJsPdfSave).toHaveBeenCalledTimes(1);
  });

  it("jsPDF save filename contains the current date", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPdf"));
    await waitFor(() => expect(mockJsPdfSave).toHaveBeenCalled());
    const savedName: string = mockJsPdfSave.mock.calls[0][0];
    expect(savedName).toMatch(/daily-log-\d{4}-\d{2}-\d{2}\.pdf/);
  });

  it("uses portrait orientation for tall images (height > width)", async () => {
    setupImageMock(600, 800);
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPdf"));
    await waitFor(() => expect(MockJsPDF).toHaveBeenCalled());
    expect(MockJsPDF).toHaveBeenCalledWith(
      expect.objectContaining({ orientation: "portrait" })
    );
  });

  it("uses landscape orientation for wide images (width > height)", async () => {
    setupImageMock(1200, 600);
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPdf"));
    await waitFor(() => expect(MockJsPDF).toHaveBeenCalled());
    expect(MockJsPDF).toHaveBeenCalledWith(
      expect.objectContaining({ orientation: "landscape" })
    );
  });

  it("shows export error when jsPDF constructor throws", async () => {
    MockJsPDF.mockImplementationOnce(() => { throw new Error("jspdf crash"); });
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPdf"));
    await screen.findByTestId("export-error");
  });

  it("shows export error when image fails to load during PDF export", async () => {
    class ErrorImage {
      onload: (() => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      width = 0;
      height = 0;
      private _src = "";
      set src(v: string) {
        this._src = v;
        queueMicrotask(() => this.onerror?.(new Event("error")));
      }
      get src() { return this._src; }
    }
    vi.stubGlobal("Image", ErrorImage);
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPdf"));
    await screen.findByTestId("export-error");
  });
});

// ===========================================================================
// Export guard – unsaved changes
// ===========================================================================
describe("DailyLogsPage – export guard with unsaved changes", () => {
  it("shows the export guard dialog when PNG export is triggered with dirty state", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    await makeDirty();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await screen.findByText("dailyLogs.exportUnsavedTitle");
  });

  it("shows the export guard dialog when PDF export is triggered with dirty state", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    await makeDirty();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPdf"));
    await screen.findByText("dailyLogs.exportUnsavedTitle");
  });

  it("does NOT call toPng immediately when guard dialog is shown", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    await makeDirty();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await screen.findByText("dailyLogs.exportUnsavedTitle");
    expect(mockToPng).not.toHaveBeenCalled();
  });

  it("dismisses export guard dialog on Cancel click without exporting", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    await makeDirty();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await screen.findByText("dailyLogs.exportUnsavedTitle");

    fireEvent.click(screen.getByRole("button", { name: /common.cancel/i }));
    await waitFor(() =>
      expect(screen.queryByText("dailyLogs.exportUnsavedTitle")).not.toBeInTheDocument()
    );
    expect(mockToPng).not.toHaveBeenCalled();
  });

  it("saves then exports PNG on 'Save & Export' click", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(makeOkResponse(emptyDayData))
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce(makeOkResponse(emptyDayData))
    );
    render(<DailyLogsPage />);
    await waitForLoad();
    await makeDirty();

    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await screen.findByText("dailyLogs.exportUnsavedTitle");
    fireEvent.click(screen.getByTestId("save-and-export-btn"));
    await waitFor(() => expect(mockToPng).toHaveBeenCalledTimes(1));
  });

  it("saves then exports PDF on 'Save & Export' click", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(makeOkResponse(emptyDayData))
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce(makeOkResponse(emptyDayData))
    );
    render(<DailyLogsPage />);
    await waitForLoad();
    await makeDirty();

    fireEvent.click(screen.getByText("dailyLogs.exportAsPdf"));
    await screen.findByText("dailyLogs.exportUnsavedTitle");
    fireEvent.click(screen.getByTestId("save-and-export-btn"));
    await waitFor(() => expect(mockJsPdfSave).toHaveBeenCalledTimes(1));
  });
});

// ===========================================================================
// Sticky summary card – pin / unpin
// ===========================================================================
describe("DailyLogsPage – sticky summary card", () => {
  it("summary card wrapper starts unpinned (no fixed class)", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByTestId("summary-card-wrapper").className).not.toContain("fixed");
  });

  it("pin button has correct aria-label when unpinned", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByTestId("pin-summary-btn")).toHaveAttribute(
      "aria-label", "dailyLogs.pinSummary"
    );
  });

  it("clicking pin button adds fixed positioning classes to the wrapper", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByTestId("pin-summary-btn"));
    const wrapper = screen.getByTestId("summary-card-wrapper");
    expect(wrapper.className).toContain("fixed");
    expect(wrapper.className).toContain("bottom-0");
  });

  it("clicking pin button writes 'true' to localStorage", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByTestId("pin-summary-btn"));
    expect(localStorage.getItem("dailyLogs.summaryPinned")).toBe("true");
  });

  it("pin button aria-label changes to unpinSummary when pinned", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByTestId("pin-summary-btn"));
    expect(screen.getByTestId("pin-summary-btn")).toHaveAttribute(
      "aria-label", "dailyLogs.unpinSummary"
    );
  });

  it("clicking pin button again removes fixed class (unpin)", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    const btn = screen.getByTestId("pin-summary-btn");
    fireEvent.click(btn); // pin
    fireEvent.click(btn); // unpin
    expect(screen.getByTestId("summary-card-wrapper").className).not.toContain("fixed");
  });

  it("unpinning writes 'false' to localStorage", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    const btn = screen.getByTestId("pin-summary-btn");
    fireEvent.click(btn); // pin → "true"
    fireEvent.click(btn); // unpin → "false"
    expect(localStorage.getItem("dailyLogs.summaryPinned")).toBe("false");
  });

  it("spacer element is rendered when card is pinned", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByTestId("pin-summary-btn"));
    expect(screen.getByTestId("pin-spacer")).toBeInTheDocument();
  });

  it("spacer element is NOT rendered when card is unpinned", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.queryByTestId("pin-spacer")).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Sticky card – localStorage persistence on mount
// ===========================================================================
describe("DailyLogsPage – sticky card localStorage persistence", () => {
  it("starts pinned when localStorage summaryPinned=true", async () => {
    localStorage.setItem("dailyLogs.summaryPinned", "true");
    render(<DailyLogsPage />);
    await waitForLoad();
    await waitFor(() =>
      expect(screen.getByTestId("summary-card-wrapper").className).toContain("fixed")
    );
  });

  it("starts unpinned when localStorage summaryPinned=false", async () => {
    localStorage.setItem("dailyLogs.summaryPinned", "false");
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByTestId("summary-card-wrapper").className).not.toContain("fixed");
  });

  it("starts unpinned when localStorage key is absent", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByTestId("summary-card-wrapper").className).not.toContain("fixed");
  });
});

// ===========================================================================
// General rendering
// ===========================================================================
describe("DailyLogsPage – general rendering", () => {
  it("shows loading state initially", () => {
    render(<DailyLogsPage />);
    expect(screen.getByText("common.loading")).toBeInTheDocument();
  });

  it("renders income and expense sections after load", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByText("dailyLogs.income")).toBeInTheDocument();
    expect(screen.getByText("dailyLogs.expense")).toBeInTheDocument();
  });

  it("renders net balance data-testid", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByTestId("net-balance")).toBeInTheDocument();
  });

  it("renders date navigation buttons", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByRole("button", { name: /dailyLogs.previousDay/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dailyLogs.nextDay/i })).toBeInTheDocument();
  });

  it("shows unsaved banner when a row is modified", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    await makeDirty();
    expect(screen.getByTestId("unsaved-banner")).toBeInTheDocument();
  });

  it("renders the export button", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByRole("button", { name: /dailyLogs.exportButton/i })).toBeInTheDocument();
  });

  it("calls fetch with the correct URL on mount", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/daily-logs\?date=/)
    );
  });
});

// ===========================================================================
// Dark-mode background detection in doExport
// ===========================================================================
describe("DailyLogsPage – export dark-mode background", () => {
  it("sets a non-white dark background when dark class is on document", async () => {
    document.documentElement.classList.add("dark");
    let capturedBg: string | undefined;
    mockToPng.mockImplementation(async (node: HTMLElement) => {
      capturedBg = node.style.backgroundColor;
      return "data:image/png;base64,fakedata";
    });
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await waitFor(() => expect(mockToPng).toHaveBeenCalled());
    // Dark mode sets a dark background (not white, not empty)
    expect(capturedBg).toBeTruthy();
    expect(capturedBg).not.toBe("rgb(255, 255, 255)");
    expect(capturedBg).not.toBe("#ffffff");
    expect(capturedBg).not.toBe("white");
  });

  it("sets a white background in light mode", async () => {
    document.documentElement.classList.remove("dark");
    let capturedBg: string | undefined;
    mockToPng.mockImplementation(async (node: HTMLElement) => {
      capturedBg = node.style.backgroundColor;
      return "data:image/png;base64,fakedata";
    });
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await waitFor(() => expect(mockToPng).toHaveBeenCalled());
    // Light mode sets white (#ffffff, possibly normalized by happy-dom)
    expect(["#ffffff", "rgb(255, 255, 255)", "white"]).toContain(capturedBg);
  });

  it("restores export header display to none after export", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await waitFor(() => expect(mockToPng).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("export-header").style.display).toBe("none"));
  });
});

// ===========================================================================
// Export site-URL span is populated imperatively
// ===========================================================================
describe("DailyLogsPage – export site URL population", () => {
  it("site URL span is initially empty", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    const footer = screen.getByTestId("export-footer");
    const span = footer.querySelector("span:last-child");
    expect(span?.textContent).toBe("");
  });

  it("site URL span contains 'Generated' during toPng capture", async () => {
    let urlText: string | null | undefined;
    mockToPng.mockImplementation(async (node: HTMLElement) => {
      const footer = node.querySelector("[data-testid='export-footer']");
      const span = footer?.querySelector("span:last-child");
      urlText = span?.textContent;
      return "data:image/png;base64,fakedata";
    });
    render(<DailyLogsPage />);
    await waitForLoad();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await waitFor(() => expect(mockToPng).toHaveBeenCalled());
    expect(urlText).toContain("Generated");
  });
});

// ===========================================================================
// Summary card content
// ===========================================================================
describe("DailyLogsPage – summary card content", () => {
  it("renders Previous Balance label", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getAllByText("dailyLogs.previousBalance").length).toBeGreaterThan(0);
  });

  it("renders Net Balance label", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByText("dailyLogs.netBalance")).toBeInTheDocument();
  });

  it("net balance reflects previousBalance from API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      makeOkResponse({ ...emptyDayData, previousBalance: 2500 })
    ));
    render(<DailyLogsPage />);
    await waitForLoad();
    expect(screen.getByTestId("net-balance").textContent).toContain("2,500");
  });
});

// ===========================================================================
// Export guard dialog content
// ===========================================================================
describe("DailyLogsPage – export guard dialog content", () => {
  async function openGuard() {
    render(<DailyLogsPage />);
    await waitForLoad();
    await makeDirty();
    fireEvent.click(screen.getByText("dailyLogs.exportAsPng"));
    await screen.findByText("dailyLogs.exportUnsavedTitle");
  }

  it("shows the export guard description text", async () => {
    await openGuard();
    expect(screen.getByText("dailyLogs.exportUnsavedDesc")).toBeInTheDocument();
  });

  it("shows the Save & Export button", async () => {
    await openGuard();
    expect(screen.getByTestId("save-and-export-btn")).toBeInTheDocument();
  });

  it("export guard dialog closes on Cancel", async () => {
    await openGuard();
    fireEvent.click(screen.getByRole("button", { name: /common.cancel/i }));
    await waitFor(() =>
      expect(screen.queryByText("dailyLogs.exportUnsavedTitle")).not.toBeInTheDocument()
    );
  });
});

// ===========================================================================
// Regression: nav-guard modal still works
// ===========================================================================
describe("DailyLogsPage – nav-guard modal (regression)", () => {
  it("nav-guard modal appears when clicking a nav link with unsaved changes", async () => {
    render(<DailyLogsPage />);
    await waitForLoad();
    await makeDirty();

    // Use setAttribute so getAttribute("href") returns the value (not just the IDL property)
    const link = document.createElement("a");
    link.setAttribute("href", "/dashboard");
    document.body.appendChild(link);
    fireEvent.click(link, { bubbles: true });
    await screen.findByText("dailyLogs.unsavedChangesTitle");
    document.body.removeChild(link);
  });
});

// ===========================================================================
// Save functionality (regression)
// ===========================================================================
describe("DailyLogsPage – save (regression)", () => {
  it("calls POST /api/daily-logs on save", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeOkResponse(emptyDayData))
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    render(<DailyLogsPage />);
    await waitForLoad();

    const saveBtns = screen.getAllByRole("button", { name: /common.save/i });
    fireEvent.click(saveBtns[0]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/daily-logs",
        expect.objectContaining({ method: "POST" })
      )
    );
  });

  it("shows save error when API returns non-ok", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeOkResponse(emptyDayData))
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Server error" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<DailyLogsPage />);
    await waitForLoad();
    await makeDirty();

    const saveBtns = screen.getAllByRole("button", { name: /common.save/i });
    fireEvent.click(saveBtns[0]);
    await screen.findByText("Server error");
  });
});
