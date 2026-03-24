export const metadata = {
  title: "My Dashboard",
  description: "Interactive project dashboard with editable data",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
