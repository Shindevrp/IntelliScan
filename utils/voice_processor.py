"""
Voice command processing for the AI-powered scanner
"""
import os
import logging
import tempfile
import speech_recognition as sr
from utils.telemetry import get_tracer
from config import VOICE_RECOGNITION_LANGUAGE

# Configure logging
logger = logging.getLogger(__name__)

def process_voice_command(audio_data):
    """Process voice command audio data and return recognized text"""
    tracer = get_tracer("voice_processor")
    
    with tracer.start_as_current_span("process_voice_command") as span:
        try:
            # Initialize speech recognizer
            recognizer = sr.Recognizer()
            
            # Save audio data to a temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
                temp_audio.write(audio_data.read())
                temp_filename = temp_audio.name
            
            # Process the audio file
            with sr.AudioFile(temp_filename) as source:
                # Adjust for ambient noise
                recognizer.adjust_for_ambient_noise(source)
                
                # Record audio from the file
                audio = recognizer.record(source)
                
                # Recognize speech using Google Speech Recognition (or other available engines)
                text = recognizer.recognize_google(audio, language=VOICE_RECOGNITION_LANGUAGE)
                
                logger.info(f"Voice command recognized: {text}")
                span.set_attribute("recognized_text", text)
                
                # Clean up the temporary file
                os.unlink(temp_filename)
                
                return text
                
        except sr.UnknownValueError:
            logger.warning("Google Speech Recognition could not understand audio")
            span.record_exception(sr.UnknownValueError("Could not understand audio"))
        except sr.RequestError as e:
            logger.error(f"Could not request results from Google Speech Recognition service: {str(e)}")
            span.record_exception(e)
        except Exception as e:
            logger.error(f"Error processing voice command: {str(e)}")
            span.record_exception(e)
            
            # Clean up the temporary file if it exists
            if 'temp_filename' in locals():
                try:
                    os.unlink(temp_filename)
                except:
                    pass
        
        return None

# Example usage for extensibility:
def process_voice_command_from_file(file_path):
    """Process a voice command from a file path (for extensibility/testing)"""
    with open(file_path, 'rb') as audio_file:
        return process_voice_command(audio_file)
