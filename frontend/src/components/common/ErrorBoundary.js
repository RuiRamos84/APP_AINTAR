import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log("Erro capturado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Aconteceu algo de errado. Por favor, recarregue a página.</h1>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
