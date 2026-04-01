// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    ...rest
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    [key: string]: unknown;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} {...rest} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { Sidebar } from "@/components/layout/sidebar";

const defaultProps = {
  user: { name: "Test User", email: "test@example.com" },
  theme: "light" as const,
  onThemeToggle: vi.fn(),
  locale: "en",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Sidebar – logo/brand links to dashboard", () => {
  it("renders FinanceFrz logo images", () => {
    render(<Sidebar {...defaultProps} />);
    const logos = screen.getAllByAltText("FinanceFrz logo");
    expect(logos.length).toBeGreaterThan(0);
  });

  it("mobile header logo is wrapped in a link to /dashboard", () => {
    render(<Sidebar {...defaultProps} />);
    // All links with aria-label pointing to dashboard
    const dashboardLinks = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("href") === "/dashboard");
    // At minimum the mobile header logo link
    expect(dashboardLinks.length).toBeGreaterThan(0);
  });

  it("desktop sidebar logo is wrapped in a link to /dashboard", () => {
    render(<Sidebar {...defaultProps} />);
    const links = screen.getAllByRole("link");
    const brandLinks = links.filter(
      (l) =>
        l.getAttribute("href") === "/dashboard" &&
        l.getAttribute("aria-label") === "FinanceFrz – go to dashboard"
    );
    // Both mobile header and desktop sidebar brand link
    expect(brandLinks.length).toBeGreaterThanOrEqual(2);
  });

  it("brand links have the correct aria-label", () => {
    render(<Sidebar {...defaultProps} />);
    const brandLinks = screen.getAllByLabelText("FinanceFrz – go to dashboard");
    expect(brandLinks.length).toBeGreaterThanOrEqual(2);
    brandLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/dashboard");
    });
  });

  it("renders the FinanceFrz text label", () => {
    render(<Sidebar {...defaultProps} />);
    const labels = screen.getAllByText("FinanceFrz");
    expect(labels.length).toBeGreaterThan(0);
  });

  it("renders the nav items", () => {
    render(<Sidebar {...defaultProps} />);
    // nav items use translation keys as text
    expect(screen.getAllByText("dashboard").length).toBeGreaterThan(0);
  });

  it("renders the user name in the footer", () => {
    render(<Sidebar {...defaultProps} />);
    const items = screen.getAllByText("Test User");
    expect(items.length).toBeGreaterThan(0);
  });

  it("renders the user email when name is absent", () => {
    render(<Sidebar {...defaultProps} user={{ email: "noname@example.com" }} />);
    const items = screen.getAllByText("noname@example.com");
    expect(items.length).toBeGreaterThan(0);
  });

  it("renders the theme toggle button", () => {
    render(<Sidebar {...defaultProps} />);
    const themeButtons = screen.getAllByLabelText("Toggle theme");
    expect(themeButtons.length).toBeGreaterThan(0);
  });
});
