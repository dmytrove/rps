class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.items = [];

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('scene-container').appendChild(this.renderer.domElement);
        
        this.camera.position.z = 100;
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(10, 10, 10);
        
        this.scene.add(ambientLight);
        this.scene.add(pointLight);

        window.addEventListener('resize', () => this.onWindowResize());
    }

    createItem(type, position) {
        const geometry = this.getGeometryForType(type);
        const material = new THREE.MeshPhongMaterial({ color: this.getColorForType(type) });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(position.x, position.y, 0);
        mesh.userData.type = type;
        mesh.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            0
        );

        this.scene.add(mesh);
        this.items.push(mesh);
        return mesh;
    }

    getGeometryForType(type) {
        switch(type) {
            case 'rock':
                return new THREE.OctahedronGeometry(5);
            case 'paper':
                return new THREE.BoxGeometry(8, 8, 2);
            case 'scissors':
                return new THREE.ConeGeometry(4, 10, 32);
        }
    }

    getColorForType(type) {
        switch(type) {
            case 'rock': return 0x808080;
            case 'paper': return 0xffffff;
            case 'scissors': return 0xff0000;
        }
    }

    updatePositions(speed) {
        for (let item of this.items) {
            item.position.add(item.userData.velocity.multiplyScalar(speed));
            
            // Bounce off walls
            if (Math.abs(item.position.x) > 80) {
                item.userData.velocity.x *= -1;
            }
            if (Math.abs(item.position.y) > 45) {
                item.userData.velocity.y *= -1;
            }
        }
    }

    checkCollisions() {
        for (let i = 0; i < this.items.length; i++) {
            for (let j = i + 1; j < this.items.length; j++) {
                const item1 = this.items[i];
                const item2 = this.items[j];
                
                const distance = item1.position.distanceTo(item2.position);
                if (distance < 10) {
                    return { item1, item2 };
                }
            }
        }
        return null;
    }

    removeItem(item) {
        this.scene.remove(item);
        this.items = this.items.filter(i => i !== item);
    }

    clearScene() {
        for (let item of this.items) {
            this.scene.remove(item);
        }
        this.items = [];
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
