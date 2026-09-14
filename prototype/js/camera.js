// 카메라 권한·스트림 관리. 영상은 <video> 요소에만 붙이고 어디에도 저장·전송하지 않는다.

export class Camera {
  constructor(videoEl, { width = 640, height = 480 } = {}) {
    this.video = videoEl;
    this.constraints = { audio: false, video: { facingMode: 'user', width: { ideal: width }, height: { ideal: height } } };
    this.stream = null;
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('이 브라우저는 카메라를 지원하지 않아요.');
    this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await new Promise((resolve) => {
      if (this.video.readyState >= 2) return resolve();
      this.video.onloadedmetadata = () => resolve();
    });
    await this.video.play();
    return this;
  }

  get aspect() {
    const w = this.video.videoWidth, h = this.video.videoHeight;
    return w && h ? w / h : 4 / 3;
  }

  stop() {
    if (this.stream) for (const track of this.stream.getTracks()) track.stop();
    this.stream = null;
    this.video.srcObject = null;
  }
}
