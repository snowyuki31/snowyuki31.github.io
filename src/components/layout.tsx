import * as React from "react";
import CssBaseline from "@mui/material/CssBaseline";
import Head from "next/head";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import AcUnitIcon from "@mui/icons-material/AcUnit";

const theme = createTheme({
  palette: {
    mode: "dark",
  },
});

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider theme={theme}>
      <Head>
        <title>snowyuki31</title>
      </Head>
      <Container component="main" maxWidth="lg">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {children}
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default Layout;
