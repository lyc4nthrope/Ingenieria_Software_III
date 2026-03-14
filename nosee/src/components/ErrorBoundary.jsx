import { Component } from "react";
import { TRANSLATIONS } from "@/contexts/LanguageContext";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || TRANSLATIONS["es-MX"].errorBoundary.message,
    };
  }

  componentDidCatch(error, info) {
    // Se mantiene log en consola para debugging local.
    console.error("ErrorBoundary capturó un error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section style={styles.wrapper}>
        <h2 style={styles.title}>Algo salió mal</h2>
        <p style={styles.text}>{this.state.message}</p>
        <p style={styles.text}>Intenta recargar la página para continuar.</p>
        <button type="button" style={styles.button} onClick={this.handleReload}>
          Recargar
        </button>
      </section>
    );
  }
}

const styles = {
  wrapper: {
    margin: "24px",
    border: "1px solid var(--error)",
    borderRadius: "12px",
    background: "var(--error-soft)",
    padding: "18px",
    color: "var(--error)",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "1.25rem",
  },
  text: {
    margin: "4px 0",
    fontSize: "0.875rem",
  },
  button: {
    marginTop: "12px",
    border: "none",
    borderRadius: "8px",
    background: "var(--error)",
    color: "var(--text-primary)",
    padding: "10px 14px",
    cursor: "pointer",
  },
};
