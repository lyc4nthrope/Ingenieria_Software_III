import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Ocurrió un error inesperado en la interfaz.",
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
    border: "1px solid #fecaca",
    borderRadius: "12px",
    background: "#fef2f2",
    padding: "18px",
    color: "#7f1d1d",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "20px",
  },
  text: {
    margin: "4px 0",
    fontSize: "14px",
  },
  button: {
    marginTop: "12px",
    border: "none",
    borderRadius: "8px",
    background: "#b91c1c",
    color: "#fff",
    padding: "10px 14px",
    cursor: "pointer",
  },
};
