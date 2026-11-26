import * as THREE from "three";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMAnimation } from "../../lib/VRMAnimation/VRMAnimation";
import { VRMLookAtSmootherLoaderPlugin } from "@/lib/VRMLookAtSmootherLoaderPlugin/VRMLookAtSmootherLoaderPlugin";
import { LipSync } from "../lipSync/lipSync";
import { EmoteController } from "../emoteController/emoteController";
import { Screenplay } from "../messages/messages";

/**
 * 3Dキャラクターを管理するクラス
 */
export class Model {
  public vrm?: VRM | null;
  public mixer?: THREE.AnimationMixer;
  public emoteController?: EmoteController;

  private _lookAtTargetParent: THREE.Object3D;
  private _lipSync?: LipSync;

  private prevPlayedEmotion: string | null = null;

  constructor(lookAtTargetParent: THREE.Object3D, withAudio: boolean) {
    this._lookAtTargetParent = lookAtTargetParent;
    if (withAudio) this._lipSync = new LipSync(new AudioContext());
  }
  /**
   * 音声のミュート状態を切り替える
   */
  public setMuted(muted: boolean) {
    this._lipSync?.setMuted(muted);
  }

  /**
   * 現在のミュート状態を取得する
   */
  public getMuted() {
    return this._lipSync?.getMuted() ?? true;
  }
  
  public async loadVRM(url: string): Promise<void> {
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((resource) => {
      if (resource === url || /^(blob|data):/i.test(resource)) return resource;
      throw new Error("VRM external resources are not supported");
    });
    const loader = new GLTFLoader(manager);
    loader.register(
      (parser) =>
        new VRMLoaderPlugin(parser, {
          lookAtPlugin: new VRMLookAtSmootherLoaderPlugin(parser),
        })
    );

    const gltf = await loader.loadAsync(url);

    const vrm: VRM | undefined = gltf.userData.vrm;
    if (!vrm) {
      VRMUtils.deepDispose(gltf.scene);
      throw new Error("VRM data is missing");
    }
    this.vrm = vrm;
    vrm.scene.name = "VRMRoot";

    VRMUtils.rotateVRM0(vrm);
    this.mixer = new THREE.AnimationMixer(vrm.scene);

    this.emoteController = new EmoteController(vrm, this._lookAtTargetParent);
  }

  public unLoadVrm() {
    if (this._lipSync) {
      void this._lipSync.audio.close().catch(() => {});
      this._lipSync = undefined;
    }
    if (this.vrm) {
      VRMUtils.deepDispose(this.vrm.scene);
      this.vrm = null;
    }
  }

  /**
   * VRMアニメーションを読み込む
   *
   * https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm_animation-1.0/README.ja.md
   */
  public async loadAnimation(vrmAnimation: VRMAnimation): Promise<void> {
    const { vrm, mixer } = this;
    if (vrm == null || mixer == null) {
      throw new Error("You have to load VRM first");
    }

    const clip = vrmAnimation.createAnimationClip(vrm);
    const action = mixer.clipAction(clip);
    action.play();
  }

  /**
   * 音声を再生し、リップシンクを行う
   */
  public async speak(buffer: ArrayBuffer | null, screenplay: Screenplay) {
    // prevent flickering of avatar expression
    if (this.prevPlayedEmotion !== screenplay.expression) {
      this.emoteController?.playEmotion(screenplay.expression);
      this.prevPlayedEmotion = screenplay.expression;
    }

    if (!buffer) {
      return;
    }

    await new Promise((resolve) => {
      this._lipSync?.playFromArrayBuffer(buffer, () => {
        resolve(true);
      });
    });
  }

  public update(delta: number): void {
    if (this._lipSync) {
      const { volume } = this._lipSync.update();

      // variable for expression controller
      let expression = this.vrm?.expressionManager?.getExpression("JawOpen");
      if (expression) {
        // handle Perfect Sync standard
        
        // @ts-ignore
        this.emoteController?.lipSync("JawOpen", volume);
        // this.emoteController?.lipSync("MouthStretch", 0.4 * volume);
      } else {
        this.emoteController?.lipSync("aa", volume);
      }
    }

    this.emoteController?.update(delta);
    this.mixer?.update(delta);
    this.vrm?.update(delta);
  }
}
