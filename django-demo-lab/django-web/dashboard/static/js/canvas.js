/* ============================================================================
 * Babylon.js Scene Framework
 * ----------------------------------------------------------------------------
 * 구성 요소 개요:
 *  - 3D 모델 : Babylon 기본 프리미티브(Box, Sphere, Plane, Torus, Cylinder, Ground 등)
 *               또는 외부 파일(.glTF / .glb / .obj / .stl 등)
 *  - Scene 구조 :
 *       1) 엔진 초기화 및 렌더 루프
 *       2) 유틸리티 (검색, 변환, 배치 함수)
 *       3) 카메라 설정 및 시점 프리셋
 *       4) 광원 설정
 *       5) 모델 로드 및 재질 구성
 *       6) UI 이벤트, 리사이즈 대응
 * ========================================================================== */

var canvas = document.getElementById("renderCanvas");
var loadchecker = false;
var engine = null;
var scene = null;
var sceneToRender = null;
var path;

/* ----------------------------------------------------------------------------
 * 검색 유틸리티
 * ----------------------------------------------------------------------------
 * Babylon.js 객체 배열(scene.meshes, scene.transformNodes 등)에서
 * 지정한 name을 가진 인덱스를 반환합니다.
 * -------------------------------------------------------------------------- */
/**
 * @param {Array} meshes - 검색 대상 배열
 * @param {string} name - 찾을 오브젝트 이름
 * @returns {number|null} - 존재 시 인덱스, 없으면 null
 */
var search = function (meshes, name) {
    let searchIndex = null;
    meshes.forEach(function (item, i) {
        if (item.name === name) searchIndex = i;
    });
    return searchIndex;
};

/* ----------------------------------------------------------------------------
 * 엔진 초기화 및 렌더 루프
 * ---------------------------------------------------------------------------- */

/**
 * Babylon Engine 생성 (캔버스 기반)
 * @returns {BABYLON.Engine}
 */
var createDefaultEngine = function () {
    return new BABYLON.Engine(
        canvas,
        true,
        { preserveDrawingBuffer: true, stencil: true },
        true
    );
};

/**
 * Babylon 렌더 루프 실행
 * @param {BABYLON.Engine} engine
 * @param {HTMLCanvasElement} canvas
 */
var startRenderLoop = function (engine, canvas) {
    engine.runRenderLoop(function () {
        if (sceneToRender && sceneToRender.activeCamera) {
            sceneToRender.render();
        }
    });
};

/* ----------------------------------------------------------------------------
 * 카메라 설정 (ArcRotateCamera)
 * ----------------------------------------------------------------------------
 *  - setCamera(): 기본 카메라 생성 및 초기 세팅
 *  - setOrbit(): 지정 각도(도 단위)로 부드럽게 시점 이동
 *  - frameObject(): 객체 중심 자동 프레이밍
 *  - 프리셋 뷰(viewFrontIso 등)
 * -------------------------------------------------------------------------- */

/**
 * ArcRotateCamera 생성 및 초기 세팅
 * @param {BABYLON.Scene} _scene
 */
var setCamera = function (_scene) {
    window.camera = new BABYLON.ArcRotateCamera("C_1", 0, 0, 0, new BABYLON.Vector3(0, 6, 0), _scene);

    // 팬 비활성화
    camera.panningSensibility = 0;
    camera.inputs.attached.pointers.panningSensibility = 0;

    // 사용자 조작 비활성화 (마우스, 터치)
    camera.detachControl(canvas);
};

// 도(deg) → 라디안 변환 헬퍼
const deg2rad = d => d * Math.PI / 180;

/**
 * 카메라 시점을 (yaw, pitch, distance)로 애니메이션 이동
 * @param {BABYLON.ArcRotateCamera} cam
 * @param {Object} params - { yawDeg, pitchDeg, distance }
 * @param {number} durationMs - 애니메이션 지속 시간(ms)
 */
function setOrbit(cam, { yawDeg, pitchDeg, distance }, durationMs = 300) {
    const eps = 0.001;
    const alpha = deg2rad(yawDeg);
    const beta = Math.min(Math.max(deg2rad(pitchDeg), eps), Math.PI - eps);

    const easing = new BABYLON.CubicEase();
    easing.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

    const anim = (prop, from, to) => {
        const a = new BABYLON.Animation("cam_" + prop, prop, 60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        a.setKeys([{ frame: 0, value: from }, { frame: 60, value: to }]);
        a.setEasingFunction(easing);
        return a;
    };

    cam.animations = [
        anim("alpha", cam.alpha, alpha),
        anim("beta", cam.beta, beta),
        anim("radius", cam.radius, distance)
    ];
    cam.getScene().beginAnimation(cam, 0, 60, false, 60 * (durationMs / 1000));
}

/**
 * 대상 오브젝트를 자동 프레이밍
 * @param {BABYLON.Camera} cam
 * @param {BABYLON.AbstractMesh} targetNodeOrMesh
 * @param {number} margin - 여백 비율 (기본 1.15)
 * @param {boolean} keepAngles - 기존 카메라 각도 유지 여부
 */
function frameObject(cam, targetNodeOrMesh, margin = 1.15, keepAngles = true) {
    const { min, max } = targetNodeOrMesh.getHierarchyBoundingVectors();
    const bi = new BABYLON.BoundingInfo(min, max);
    const center = bi.boundingSphere.centerWorld;
    const radius = bi.boundingSphere.radiusWorld * margin;

    cam.setTarget(center);

    const fov = cam.fov;
    const dist = radius / Math.sin(fov / 2);

    const yaw = keepAngles ? BABYLON.Tools.ToDegrees(cam.alpha) : 35;
    const pitch = keepAngles ? BABYLON.Tools.ToDegrees(cam.beta) : 55;

    setOrbit(cam, { yawDeg: yaw, pitchDeg: pitch, distance: dist }, 250);
}

/**
 * 카메라 초기 시점 지정
 */
function initCameraView() {
    if (!window.camera) return;
    camera.setTarget(new BABYLON.Vector3(-25, 0, 0));
    camera.alpha = 0.61;
    camera.beta = 0.95;
    camera.radius = 79.1713;
    camera.panningSensibility = 0;
}

// 시점 프리셋
function viewFrontIso() { setOrbit(camera, { yawDeg: 35, pitchDeg: 55, distance: camera.radius }); }
function viewRightIso() { setOrbit(camera, { yawDeg: 90, pitchDeg: 90, distance: camera.radius }); }
function viewTop()      { setOrbit(camera, { yawDeg: 90, pitchDeg: 0, distance: camera.radius }); }

/* ----------------------------------------------------------------------------
 * 광원 설정
 * ----------------------------------------------------------------------------
 * HemisphericLight 1개 사용 (부드러운 확산광)
 * -------------------------------------------------------------------------- */
var setLight = function (_scene) {
    window.light = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0, 1, 0), _scene);
    light.intensity = 1.2;
    light.diffuse = new BABYLON.Color3(0.95, 0.95, 0.95);
};

/* ----------------------------------------------------------------------------
 * 트랜스폼 유틸리티 (위치, 회전, 스케일 제어)
 * -------------------------------------------------------------------------- */
function setAbPoint(_mesh, x, y, z) { _mesh.position.set(x, y, z); }
function setTransPoint(_mesh, x, y, z) { _mesh.translate(new BABYLON.Vector3(x, y, z), 1, BABYLON.Space.WORLD); }
function setAbScaling(_mesh, sx, sy, sz) { _mesh.scaling.set(sx, sy, sz); }
function setAbRotation(_mesh, rx, ry, rz) { _mesh.rotation.set(rx, ry, rz); }

/**
 * 특정 ID의 CellPack 또는 RackCase를 축 기준으로 이동
 * @param {number} id - 대상 ID (1~7)
 * @param {"x"|"y"|"z"} axis - 이동 축
 * @param {number} offset - 이동 거리
 */
function moveCellPackById(id, axis, offset) {
    if (!window.sceneIns || !sceneIns.meshes) return console.warn("Scene이 초기화되지 않음");

    let targetName;
    switch (id) {
        case 1: targetName = "cellPack"; break;
        case 2: targetName = "rackCase5"; break;
        case 3: targetName = "rackCase4"; break;
        case 4: targetName = "rackCase3"; break;
        case 5: targetName = "rackCase2"; break;
        case 6: targetName = "rackCase1"; break;
        case 7: targetName = "cellPackCase_low"; break;
        default: return console.warn("⚠ 유효하지 않은 ID:", id);
    }

    const mesh = sceneIns.getMeshByName(targetName);
    if (!mesh) return console.warn("대상 mesh 없음:", targetName);

    mesh.position[axis] += offset;
    console.log(`${targetName} (${axis.toUpperCase()}축) ${offset}만큼 이동`);
}

/* ----------------------------------------------------------------------------
 * Scene 생성 (모델 로드 및 구성)
 * ----------------------------------------------------------------------------
 * - HDR 환경맵 설정
 * - 모델 로드(batteryCase, cellPack, cellPackCase_low)
 * - 복제 및 배치
 * -------------------------------------------------------------------------- */
var createScene = async function (engine) {
    const scene = new BABYLON.Scene(engine);

    setCamera(scene);
    setLight(scene);

    const hdrTexture = new BABYLON.HDRCubeTexture("/static/hdr/industrial_sunset_puresky_4k.hdr", scene, 512);
    scene.clearColor = new BABYLON.Color3(0.102, 0.114, 0.161);

    // [1] 배터리 케이스
    BABYLON.SceneLoader.ImportMesh("", "/static/3d/", "batteryCase.glb", scene, () => {
        const mesh = scene.meshes[search(scene.meshes, "batteryCase")];
        scene.meshes[search(scene.meshes, "__root__")].name = "battery_case_container";
        mesh.addRotation(0, Math.PI / 36, 0);
        setAbPoint(mesh, -0.005, 11.480, 0.162);
        for (x in scene.materials) scene.materials[x].reflectionTexture = hdrTexture;
    });

    // [2] 상단 셀 팩
    BABYLON.SceneLoader.ImportMesh("", "/static/3d/", "cellPack.glb", scene, () => {
        const pack = scene.meshes[search(scene.meshes, "cellPack")];
        pack.parent.name = "cellPackContainer";
        setAbPoint(pack, 25, 18.5, 0);
        for (x in scene.materials) scene.materials[x].reflectionTexture = hdrTexture;
    });

    // [3] 하단 셀팩 케이스 (복제 포함)
    BABYLON.SceneLoader.ImportMesh("", "/static/3d/", "cellPackCase_low.glb", scene, () => {
        const rack = scene.meshes[search(scene.meshes, "cellPackCase_low")];
        setAbPoint(rack, 25, -17, 0);
        rack.parent.name = "cellPackCaseContainer";

        const container = scene.meshes[search(scene.meshes, "cellPackCaseContainer")];

        for (let i = 1; i <= 5; i++) {
            const clone = rack.clone("rackCase" + i);
            clone.parent = container;
        }

        setAbPoint(scene.meshes[search(scene.meshes, "rackCase1")], 25, -11.15, 0);
        setAbPoint(scene.meshes[search(scene.meshes, "rackCase2")], 25, -5.2, 0);
        setAbPoint(scene.meshes[search(scene.meshes, "rackCase3")], 25, 0.8, 0);
        setAbPoint(scene.meshes[search(scene.meshes, "rackCase4")], 25, 6.7, 0);
        setAbPoint(scene.meshes[search(scene.meshes, "rackCase5")], 25, 12.6, 0);

        for (x in scene.materials) scene.materials[x].reflectionTexture = hdrTexture;

    });

    // scene.debugLayer.show({ embedMode: false }).then(function () {
    //     document.getElementById("scene-explorer-host").style.zIndex = "1000";
    //     document.getElementById("inspector-host").style.zIndex = "1000";
    //     document.getElementById("scene-explorer-host").style.position = "fixed";
    //     document.getElementById("inspector-host").style.position = "fixed";
    // });

    window.meshes = scene.meshes;
    window.sceneIns = scene;

    initCameraView();
    viewFrontIso();
    return scene;
};

/* ----------------------------------------------------------------------------
 * 온도별 머티리얼 적용
 * ----------------------------------------------------------------------------
 * - 지정 ID(CellPack/RackCase)에 대해 온도 구간별 색상 변경
 * - 40℃ 이하: 유지 / 41~60℃: 주황 / 60℃ 초과: 빨강
 * -------------------------------------------------------------------------- */
const ORIGINAL_MATS = new Map();

function cloneMaterial(mat, scene) {
    if (!mat) return null;
    
    // 동일 타입의 새 PBR 머티리얼 생성
    const clone = new BABYLON.PBRMaterial("clone_" + mat.name, scene);

    // 주요 속성 복제 (색상, 반사, 메탈, 러프니스 등)
    if (mat.albedoColor) clone.albedoColor = mat.albedoColor.clone();
    if (mat.metallic !== undefined) clone.metallic = mat.metallic;
    if (mat.roughness !== undefined) clone.roughness = mat.roughness;
    if (mat.reflectionTexture) clone.reflectionTexture = mat.reflectionTexture;
    if (mat.emissiveColor) clone.emissiveColor = mat.emissiveColor.clone();
    if (mat.microSurface !== undefined) clone.microSurface = mat.microSurface;

    return clone;
}
function cacheOriginalMaterial(mesh) {
    if (!mesh || ORIGINAL_MATS.has(mesh.name)) return;
    if (mesh.material) {
        ORIGINAL_MATS.set(mesh.name, cloneMaterial(mesh.material, sceneIns));
    }
}

function restoreOriginalMaterial(mesh) {
    if (!mesh) return;
    const orig = ORIGINAL_MATS.get(mesh.name);
    if (orig) mesh.material = orig;
}
// 하위까지 모두 원본 머티리얼 백업
function rememberOriginalMaterials(root) {
  root.getChildMeshes(true).forEach(m => {
    if (!m.metadata) m.metadata = {};
    if (!m.metadata.origMat) m.metadata.origMat = m.material || null;
  });
}

/**
 * 셀팩 온도별 머티리얼 교체 (≤40℃는 원래 재질 복원)
 */
function applyTempMaterial(id, temp) {
    if (!window.sceneIns) return;

    const map = {
        1: "cellPack",
        2: "rackCase5",
        3: "rackCase4",
        4: "rackCase3",
        5: "rackCase2",
        6: "rackCase1",
        7: "cellPackCase_low"
    };
    const targetName = map[id];
    const mesh = sceneIns.getMeshByName(targetName);
    if (!mesh) return;

    cacheOriginalMaterial(mesh);

    if (temp <= 40) {
        restoreOriginalMaterial(mesh);
        console.log(`${targetName} ${temp}℃ → 원래 재질 복원`);
        return;
    }

    let color = temp <= 60 ? new BABYLON.Color3(1, 0.65, 0) : new BABYLON.Color3(1, 0, 0);
    const tempMat = new BABYLON.PBRMaterial("tempMat_" + id, sceneIns);
    tempMat.albedoColor = color;
    tempMat.metallic = 0.2;
    tempMat.roughness = 0.8;
    if (mesh.material?.reflectionTexture)
        tempMat.reflectionTexture = mesh.material.reflectionTexture;

    mesh.material = tempMat;
    console.log(`${targetName} (ID ${id}) 온도 ${temp}℃ → 색상 변경`);
}


/* ----------------------------------------------------------------------------
 * 초기화 루틴 (엔진 생성 / Scene 로드 / 이벤트 연결)
 * -------------------------------------------------------------------------- */
window.initFunction = async function () {
    const asyncEngineCreation = async function () {
        try { return createDefaultEngine(); }
        catch { return createDefaultEngine(); }
    };

    window.engine = await asyncEngineCreation();
    if (!engine) throw 'engine should not be null.';

    startRenderLoop(engine, canvas);
    window.scene = createScene();

    // 카메라 프리셋 버튼
    const camButtons = [
        { id: "cam-1", fn: viewFrontIso },
        { id: "cam-2", fn: viewRightIso },
        { id: "cam-3", fn: viewTop },
    ];
    camButtons.forEach(({ id, fn }) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener("click", fn);
    });

    // CellPack 이동 버튼
    const moveBtn = document.getElementById("btn-apply-offset");
    if (moveBtn) {
        moveBtn.addEventListener("click", () => {
            const id = parseInt(document.getElementById("move-cellpack").value);
            const axis = document.getElementById("move-axis").value;
            const offset = parseFloat(document.getElementById("move-offset").value);
            if (isNaN(id) || isNaN(offset)) return alert("유효한 ID/Offset 입력 필요");
            moveCellPackById(id, axis, offset);
        });
    }

    // 온도 적용 버튼
    document.getElementById("btn-apply-temp").addEventListener("click", () => {
        const id = parseInt(document.getElementById("temp-cellpack").value);
        const temp = parseFloat(document.getElementById("temp-value").value);
        applyTempMaterial(id, temp);
    });
};

// 초기화 실행 → Scene 완료 후 렌더 대상 지정
initFunction().then(() => {
    scene.then(returnedScene => { sceneToRender = returnedScene; });
});
