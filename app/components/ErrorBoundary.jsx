import React from 'react';
import { Banner, InlineStack, Button, Box, Text, Card } from "@shopify/polaris";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error("Component Error:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  resetError = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render() {
    const { componentName } = this.props;
    
    if (this.state.hasError) {
      return (
        <Card>
          <Card.Section>
            <Banner
              title={`An error occurred in ${componentName || 'a component'}`}
              tone="critical"
            >
              <Box paddingBlock="400">
                <Text as="p">Something went wrong with this component. You can try to reload it or contact support if the issue persists.</Text>
                {process.env.NODE_ENV !== 'production' && this.state.error && (
                  <Box paddingBlock="400">
                    <Text variant="bodySm" as="pre" fontFamily="monospace">
                      {this.state.error.toString()}
                    </Text>
                  </Box>
                )}
              </Box>
              <InlineStack align="end">
                <Button onClick={this.resetError}>
                  Try Again
                </Button>
              </InlineStack>
            </Banner>
          </Card.Section>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
