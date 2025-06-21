"""
Telemetry setup using OpenTelemetry for monitoring
"""
import os
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from config import OTEL_SERVICE_NAME, OTEL_EXPORTER_ENDPOINT

# Configure logging
logger = logging.getLogger(__name__)

# Initialize tracer provider
tracer_provider = None

def setup_telemetry(app=None):
    """Set up OpenTelemetry for the application"""
    global tracer_provider
    
    try:
        # Create a resource that identifies the service
        resource = Resource(attributes={
            SERVICE_NAME: OTEL_SERVICE_NAME
        })
        
        # Create a tracer provider
        tracer_provider = TracerProvider(resource=resource)
        
        # Create an exporter for the traces
        try:
            otlp_exporter = OTLPSpanExporter(endpoint=OTEL_EXPORTER_ENDPOINT)
            span_processor = BatchSpanProcessor(otlp_exporter)
            tracer_provider.add_span_processor(span_processor)
        except Exception as e:
            logger.warning(f"Failed to set up OTLP exporter: {str(e)}. Using console exporter instead.")
            # Fall back to console exporter for development
            from opentelemetry.sdk.trace.export import ConsoleSpanExporter
            console_exporter = ConsoleSpanExporter()
            console_processor = BatchSpanProcessor(console_exporter)
            tracer_provider.add_span_processor(console_processor)
        
        # Set the global tracer provider
        trace.set_tracer_provider(tracer_provider)
        
        # Instrument Flask if app is provided
        if app:
            FlaskInstrumentor().instrument_app(app)
            logger.info("Instrumented Flask app with OpenTelemetry")
        
        logger.info("OpenTelemetry setup completed")
        
    except Exception as e:
        logger.error(f"Error setting up OpenTelemetry: {str(e)}")
        logger.warning("OpenTelemetry will not be available")

def get_tracer(name):
    """Get a tracer for the given name"""
    if tracer_provider:
        return trace.get_tracer(name)
    else:
        # Return a dummy tracer if OpenTelemetry is not set up
        return DummyTracer()

class DummySpan:
    """Dummy span for when OpenTelemetry is not available"""
    
    def __init__(self):
        pass
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass
    
    def set_attribute(self, key, value):
        pass
    
    def add_event(self, name, attributes=None):
        pass
    
    def record_exception(self, exception):
        pass

class DummyTracer:
    """Dummy tracer for when OpenTelemetry is not available"""
    
    def __init__(self):
        pass
    
    def start_as_current_span(self, name, context=None, kind=None, attributes=None):
        return DummySpan()
