# The listener (tier A of "Talk to me"): faster-whisper, base.en, on the CPU, int8.
# PyAV (a faster-whisper dependency, with ffmpeg inside its wheel) decodes the iPad's
# audio/mp4 and Chrome's audio/webm. The model (about 150 MB) is downloaded on the first
# start into /root/.cache, which docker-compose.yml mounts from ./hear-cache.
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 HEAR_PORT=9000 HEAR_MODEL=base.en HEAR_THREADS=2
# requests: faster-whisper 1.1 downloads the model with it, and newer huggingface_hub no longer brings it along
RUN pip install "faster-whisper==1.1.1" "requests>=2.31"
WORKDIR /srv
COPY hear.py .
EXPOSE 9000
CMD ["python","hear.py"]
