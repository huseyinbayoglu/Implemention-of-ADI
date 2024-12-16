const gap = 0.01; // Gap between cubelets
const angleStep = .35;






const ctx = document.getElementById('qValueChart').getContext('2d');

// Göz alıcı renk olarak turkuaz seçiyoruz
const eyeCatchingColor = '#00FFFF'; // Turkuaz rengi

// Tüm barların aynı renkte olması için renk dizisini tek bir renkle dolduruyoruz
let colors = Array(12).fill(eyeCatchingColor);

const qValueChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['U', "U'", 'D', "D'", 'L', "L'", 'R', "R'", 'F', "F'", 'B', "B'"],
        datasets: [{
            label: 'Probobilities',
            data: Array(12).fill(0), // 12 elemanlı sıfır dizisi
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: '#ffffff' // Y ekseni yazı rengi
                },
                grid: {
                    color: '#333333' // Y ekseni ızgara rengi
                }
            },
            x: {
                ticks: {
                    color: '#ffffff' // X ekseni yazı rengi
                },
                grid: {
                    color: '#333333' // X ekseni ızgara rengi
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    color: '#ffffff' // Efsane yazı rengi
                }
            }
        }
    }
});

// Tahmin yapma fonksiyonunda grafiği güncelleme kısmını değiştiriyoruz
function tahminYap(girdiVerisi) {
    fetch('/tahmin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ girdi: girdiVerisi })
    })
    .then(response => response.json())
    .then(data => {
        // data.sonuc'un 12 elemanlı Q değerleri dizisi olduğunu varsayıyoruz
        const newData = data.sonuc.flat();

        // En yüksek değerin indeksini buluyoruz
        const maxIndex = newData.indexOf(Math.max(...newData));

        // Renk dizisini güncelliyoruz
        const updatedColors = Array(12).fill(eyeCatchingColor);
        updatedColors[maxIndex] = '#FF0000'; // En yüksek değeri kırmızı yapıyoruz

        // Grafiği güncelliyoruz
        qValueChart.data.datasets[0].data = newData;
        qValueChart.data.datasets[0].backgroundColor = updatedColors;
        qValueChart.data.datasets[0].borderColor = updatedColors;
        qValueChart.update();

        const yviValueElement = document.getElementById('yvi-value');

        yviValueElement.textContent = `Value Değeri: ${data.y_v_i.toFixed(5)}`; // Sayıyı yuvarlayarak göster
       
        // İsterseniz burada Q değerlerini metin olarak da gösterebilirsiniz
    })
    .catch((error) => {
        console.error('Hata:', error);
    });
}




function rotateCubeAroundPoint(cubelet,point, axis, angle) {
    // 1. Küpü dönme merkezine taşı
    cubelet.position.sub(point);
    
    // 2. Quaternion oluştur ve küpü döndür
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(axis.normalize(), angle);
    cubelet.position.applyQuaternion(quaternion);
    
    // 3. Küpü orijinal konumuna geri taşı
    cubelet.position.add(point);
    
    // 4. Küpün kendisini de döndür (isteğe bağlı)
    cubelet.quaternion.multiplyQuaternions(quaternion, cubelet.quaternion);
}

function update_number(cubelet) {
        cubelet.userData.number = positionMap[`(${cubelet.userData.position.x},${cubelet.userData.position.y},${cubelet.userData.position.z})`];
}



function createTextSprite(message, parameters = {}) {
    const fontface = parameters.fontface || 'Arial';
    const fontsize = parameters.fontsize || 110;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 256;
    context.font = fontsize + "px " + fontface;
    context.fillStyle = "rgba(0, 0, 0, 1.0)";
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(message, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5, 0.5, 1); // Ölçüleri ayarlayın
    return sprite;
}

class Cube {
    constructor() {
        // 3x3x3 boyutunda 0'dan 26'ya kadar değerlerle küp durumunu başlatma
        this.state = [];
        let counter = 0;
        for (let i = 0; i < 3; i++) {
            this.state[i] = [];
            for (let j = 0; j < 3; j++) {
                this.state[i][j] = [];
                for (let k = 0; k < 3; k++) {
                    this.state[i][j][k] = counter++;
                }
            }
        }

        this.actions = ['up', 'up_c', 'down', 'down_c', 'left', 'left_c', 'right', 'right_c',
                        'front', 'front_c', 'back', 'back_c'];
        this.action_space = this.actions.length;

    }

    // Derin kopya ile mevcut durumu döndürür
    get_state() {
        return JSON.parse(JSON.stringify(this.state));
    }

    // 2D matrisini saat yönünde k*90 derece döndürür
    rot90(matrix, k = 1) {
        let result = matrix;
        k = ((k % 4) + 4) % 4; // Negatif döndürmeleri ele alır
        for (let n = 0; n < k; n++) {
            result = this.rotate90(result);
        }
        return result;
    }

    // 2D matrisini saat yönünde 90 derece döndürür
    rotate90(matrix) {
        let N = matrix.length;
        let M = matrix[0].length;
        let result = [];
        for (let i = 0; i < M; i++) {
            result[i] = [];
            for (let j = 0; j < N; j++) {
                result[i][j] = matrix[N - j - 1][i];
            }
        }
        return result;
    }

    // 'right' dönüşünü uygular
    right() {
        let slice = [];
        for (let i = 0; i < 3; i++) {
            slice[i] = [];
            for (let j = 0; j < 3; j++) {
                slice[i][j] = this.state[i][j][2];
            }
        }
        let rotatedSlice = this.rot90(slice, 3);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                this.state[i][j][2] = rotatedSlice[i][j];
            }
        }
        return this.get_state();
    }

    // 'right' dönüşünün tersi
    right_c() {
        let slice = [];
        for (let i = 0; i < 3; i++) {
            slice[i] = [];
            for (let j = 0; j < 3; j++) {
                slice[i][j] = this.state[i][j][2];
            }
        }
        let rotatedSlice = this.rot90(slice, 1);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                this.state[i][j][2] = rotatedSlice[i][j];
            }
        }
        return this.get_state();
    }

    // Diğer dönüş fonksiyonları benzer şekilde tanımlanır
    left() {
        let slice = [];
        for (let i = 0; i < 3; i++) {
            slice[i] = [];
            for (let j = 0; j < 3; j++) {
                slice[i][j] = this.state[i][j][0];
            }
        }
        let rotatedSlice = this.rot90(slice, 1);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                this.state[i][j][0] = rotatedSlice[i][j];
            }
        }
        return this.get_state();
    }

    left_c() {
        let slice = [];
        for (let i = 0; i < 3; i++) {
            slice[i] = [];
            for (let j = 0; j < 3; j++) {
                slice[i][j] = this.state[i][j][0];
            }
        }
        let rotatedSlice = this.rot90(slice, 3);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                this.state[i][j][0] = rotatedSlice[i][j];
            }
        }
        return this.get_state();
    }

    front() {
        let slice = [];
        for (let i = 0; i < 3; i++) {
            slice[i] = [];
            for (let k = 0; k < 3; k++) {
                slice[i][k] = this.state[0][i][k];
            }
        }
        let rotatedSlice = this.rot90(slice, 1);
        for (let i = 0; i < 3; i++) {
            for (let k = 0; k < 3; k++) {
                this.state[0][i][k] = rotatedSlice[i][k];
            }
        }
        return this.get_state();
    }

    front_c() {
        let slice = [];
        for (let i = 0; i < 3; i++) {
            slice[i] = [];
            for (let k = 0; k < 3; k++) {
                slice[i][k] = this.state[0][i][k];
            }
        }
        let rotatedSlice = this.rot90(slice, 3);
        for (let i = 0; i < 3; i++) {
            for (let k = 0; k < 3; k++) {
                this.state[0][i][k] = rotatedSlice[i][k];
            }
        }
        return this.get_state();
    }

    back() {
        let slice = [];
        for (let i = 0; i < 3; i++) {
            slice[i] = [];
            for (let k = 0; k < 3; k++) {
                slice[i][k] = this.state[2][i][k];
            }
        }
        let rotatedSlice = this.rot90(slice, 3);
        for (let i = 0; i < 3; i++) {
            for (let k = 0; k < 3; k++) {
                this.state[2][i][k] = rotatedSlice[i][k];
            }
        }
        return this.get_state();
    }

    back_c() {
        let slice = [];
        for (let i = 0; i < 3; i++) {
            slice[i] = [];
            for (let k = 0; k < 3; k++) {
                slice[i][k] = this.state[2][i][k];
            }
        }
        let rotatedSlice = this.rot90(slice, 1);
        for (let i = 0; i < 3; i++) {
            for (let k = 0; k < 3; k++) {
                this.state[2][i][k] = rotatedSlice[i][k];
            }
        }
        return this.get_state();
    }

    up() {
        let slice = [];
        for (let i = 0; i < 3; i++) {
            slice[i] = [];
            for (let k = 0; k < 3; k++) {
                slice[i][k] = this.state[i][0][k];
            }
        }
        let rotatedSlice = this.rot90(slice, 3);
        for (let i = 0; i < 3; i++) {
            for (let k = 0; k < 3; k++) {
                this.state[i][0][k] = rotatedSlice[i][k];
            }
        }
        return this.get_state();
    }

    up_c() {
        let slice = [];
        for (let i = 0; i < 3; i++) {
            slice[i] = [];
            for (let k = 0; k < 3; k++) {
                slice[i][k] = this.state[i][0][k];
            }
        }
        let rotatedSlice = this.rot90(slice, 1);
        for (let i = 0; i < 3; i++) {
            for (let k = 0; k < 3; k++) {
                this.state[i][0][k] = rotatedSlice[i][k];
            }
        }
        return this.get_state();
    }

    down() {
        let slice = [];
        for (let i = 0; i < 3; i++) {
            slice[i] = [];
            for (let k = 0; k < 3; k++) {
                slice[i][k] = this.state[i][2][k];
            }
        }
        let rotatedSlice = this.rot90(slice, 1);
        for (let i = 0; i < 3; i++) {
            for (let k = 0; k < 3; k++) {
                this.state[i][2][k] = rotatedSlice[i][k];
            }
        }
        return this.get_state();
    }

    down_c() {
        let slice = [];
        for (let i = 0; i < 3; i++) {
            slice[i] = [];
            for (let k = 0; k < 3; k++) {
                slice[i][k] = this.state[i][2][k];
            }
        }
        let rotatedSlice = this.rot90(slice, 3);
        for (let i = 0; i < 3; i++) {
            for (let k = 0; k < 3; k++) {
                this.state[i][2][k] = rotatedSlice[i][k];
            }
        }
        return this.get_state();
    }



    // Belirli bir eylemi uygular ve sonucu döndürür
    step(action) {
        this[action]();
        if (this.is_solved()) {
            return [this.get_state(), this.rewards["Win"], true]; // Next_state, reward, done
        } else {
            return [this.get_state(), this.rewards["Not Done"], false]; // Next_state, reward, done
        }
    }




    // Nesnenin string temsilini döndürür
    toString() {
        return JSON.stringify(this.state);
    }

}



let mycube = new Cube();






// Create the scene
const scene = new THREE.Scene();

// Create the camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

camera.position.set(-3, 3, 8); // Set the camera position
camera.lookAt(0, 0, 0); // Point the camera to the origin

// Create the renderer and attach it to the document
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x121212); // Set background color to #121212
document.getElementById('cube-container').appendChild(renderer.domElement);


// Create multiple cubes (cubelets) and add them to the scene
const cubelets = []; // Array to store all cubelets
const positionsx = [-1, 0, 1]; // Possible positions for cubelets
const positionsy = [1, 0, -1]; // Possible positions for cubelets
const positionsz = [1, 0, -1]; // Possible positions for cubelets


// Position to number map
const positionMap = {
    '(-1,1,1)': 0,
    '(0,1,1)': 1,
    '(1,1,1)': 2,

    '(-1,0,1)': 3,
    '(0,0,1)': 4,
    '(1,0,1)': 5,

    '(-1,-1,1)': 6,
    '(0,-1,1)': 7,
    '(1,-1,1)': 8,

    '(-1,1,0)': 9,
    '(0,1,0)': 10,
    '(1,1,0)': 11,

    '(-1,0,0)': 12,
    '(0,0,0)': 13,
    '(1,0,0)': 14,

    '(-1,-1,0)': 15,
    '(0,-1,0)': 16,
    '(1,-1,0)': 17,

    '(-1,1,-1)': 18,
    '(0,1,-1)': 19,
    '(1,1,-1)': 20,

    '(-1,0,-1)': 21,
    '(0,0,-1)': 22,
    '(1,0,-1)': 23,

    '(-1,-1,-1)': 24,
    '(0,-1,-1)': 25,
    '(1,-1,-1)': 26
};

// Creating cubelets
positionsz.forEach((z) => {
    positionsy.forEach((y) => {
        positionsx.forEach((x) => {
            // Create a cubelet with different colors for each face
            const geometry = new THREE.BoxGeometry(1,1,1);
            const materials = [
                new THREE.MeshBasicMaterial({ color: 0xD62100  }), // red
                new THREE.MeshBasicMaterial({ color: 0xFFA500 }), // orange
                new THREE.MeshBasicMaterial({ color: 0xEAED35 }), // yellow
                new THREE.MeshBasicMaterial({ color: 0xffffff }), // white
                new THREE.MeshBasicMaterial({ color: 0x00ADC6 }), // blue
                new THREE.MeshBasicMaterial({ color: 0x1EB53A })  // green

            ];
            const cubelet = new THREE.Mesh(geometry, materials);

            // Set the cubelet's position with gaps
            cubelet.position.set(
                x * (1 + gap), // Adjust the x position with gap
                y * (1 + gap), // Adjust the y position with gap
                z * (1 + gap)  // Adjust the z position with gap
            );

            // Create a string from x, y, z coordinates
            const posKey = `(${x},${y},${z})`;

            // Set the userData number based on the position map
            if (posKey in positionMap) {
                cubelet.userData.number = positionMap[posKey];
            } else {
                cubelet.userData.number = null; // Or some default value
            }

            scene.add(cubelet);
            cubelet.userData.position = { x, y, z }; // Store the cubelet's position
            cubelets.push(cubelet); // Store the cubelet for later use
        });
    });
});



// Variables to keep track of rotation state
let isRotatingX = false;
let isRotatingY = false;
let isRotatingZ = false;

let rotateX_M1 = false;
let rotateX_M1_R = false;
let rotateX_1 = false;
let rotateX_1_R = false;

let rotateY_M1 = false;
let rotateY_M1_R = false;
let rotateY_1 = false;
let rotateY_1_R = false;

let rotateZ_M1 = false;
let rotateZ_M1_R = false;
let rotateZ_1 = false;
let rotateZ_1_R = false;


let rotationAngle = 0;
const targetAngle = Math.PI / 2; // 90 degrees in radians


function left() {
    isRotatingX = true;
    rotateX_M1 = true;
    rotationAngle = 0;
    mycube.left()
}

function left_prime() {
    isRotatingX = true;
    rotateX_M1_R = true;
    rotationAngle = 0;
    mycube.left_c()
}

function right() {
    isRotatingX = true;
    rotateX_1 = true;
    rotationAngle = 0;
    mycube.right()
}

function right_prime() {
    isRotatingX = true;
    rotateX_1_R = true;
    rotationAngle = 0;
    mycube.right_c()
}   

function up() {
    isRotatingY = true;
    rotateY_1 = true;
    rotationAngle = 0;
    mycube.up()
}

function up_prime() {
    isRotatingY = true;
    rotateY_1_R = true;
    rotationAngle = 0;
    mycube.up_c()
}

function down() {
    isRotatingY = true;
    rotateY_M1 = true;
    rotationAngle = 0;
    mycube.down()
}

function down_prime() {
    isRotatingY = true;
    rotateY_M1_R = true;
    rotationAngle = 0;
    mycube.down_c()
}

function front() {
    isRotatingZ = true;
    rotateZ_1 = true;
    rotationAngle = 0;
    mycube.front()
}

function front_prime() {
    isRotatingZ = true;
    rotateZ_1_R = true;
    rotationAngle = 0;
    mycube.front_c()
}

function back() {
    isRotatingZ = true;
    rotateZ_M1 = true;
    rotationAngle = 0;
    mycube.back()
}

function back_prime() {
    isRotatingZ = true;
    rotateZ_M1_R = true;
    rotationAngle = 0;
    mycube.back_c() 
}

let start = false;

// Listen for key press events
document.addEventListener('keydown', (event) => {
     // Check for "Shift + q" first, accounting for case sensitivity
     if ((event.key === 'Q' || (event.key === 'q' && event.shiftKey)) && !isRotatingX && !isRotatingY && !isRotatingZ) {
        // isRotatingX = true;
        // rotateX_M1_R = true;
        // rotationAngle = 0; // Reset rotation angle
        left_prime();
    } 
    else if (event.key === 'q' && !event.shiftKey && !isRotatingX && !isRotatingY && !isRotatingZ) {
        // isRotatingX = true;
        // rotateX_M1 = true;
        // rotationAngle = 0; // Reset rotation angle
        left();
    }
    
    if ((event.key === 'A' || (event.key === 'a' && event.shiftKey)) && !isRotatingX && !isRotatingY && !isRotatingZ) {
        // isRotatingX = true;
        // rotateX_1_R = true;
        // rotationAngle = 0; // Reset rotation angle
        right_prime();
    } 

    if (event.key === 'a' && !isRotatingX && !isRotatingY && !isRotatingZ) {
        // Start rotation around the X-axis when "q" is pressed and not already rotating
        // isRotatingX = true;
        // rotateX_1 = true;
        // rotationAngle = 0; // Reset rotation angle
        right();
    }




    if ((event.key === 'W' || (event.key === 'w' && event.shiftKey)) && !isRotatingX && !isRotatingY && !isRotatingZ) {
        // isRotatingY = true;
        // rotateY_1_R = true;
        // rotationAngle = 0; // Reset rotation angle
        up_prime();
    } 
    if (event.key === 'w' && !isRotatingX && !isRotatingY && !isRotatingZ) {
        // Start rotation around the Y-axis when "w" is pressed and not already rotating
        // isRotatingY = true;
        // rotateY_1 = true;
        // rotationAngle = 0; // Reset rotation angle
        up();
    }

    if ((event.key === 'S' || (event.key === 's' && event.shiftKey)) && !isRotatingX && !isRotatingY && !isRotatingZ) {
        // isRotatingY = true;
        // rotateY_M1_R = true;
        // rotationAngle = 0; // Reset rotation angle
        down_prime();
    } 
    if (event.key === 's' && !isRotatingX && !isRotatingY && !isRotatingZ) {
        // Start rotation around the Y-axis when "w" is pressed and not already rotating
        // isRotatingY = true;
        // rotateY_M1 = true;
        // rotationAngle = 0; // Reset rotation angle
        down();
    }
    


    if ((event.key === 'E' || (event.key === 'e' && event.shiftKey)) && !isRotatingX && !isRotatingY && !isRotatingZ) {
        // isRotatingZ = true;
        // rotateZ_1_R = true;
        // rotationAngle = 0; // Reset rotation angle
        front_prime();
    }
    if (event.key === 'e' && !isRotatingX && !isRotatingY && !isRotatingZ) {
        // Start rotation around the Z-axis when "e" is pressed and not already rotating
        // isRotatingZ = true;
        // rotateZ_1 = true;
        // rotationAngle = 0; // Reset rotation angle
        front();
    }


    if ((event.key === 'D' || (event.key === 'd' && event.shiftKey)) && !isRotatingX && !isRotatingY && !isRotatingZ) {
        // isRotatingZ = true;
        // rotateZ_M1_R = true;
        // rotationAngle = 0; // Reset rotation angle
        back_prime();
    }
    if (event.key === 'd' && !isRotatingX && !isRotatingY && !isRotatingZ) {
        // Start rotation around the Z-axis when "e" is pressed and not already rotating
        // isRotatingZ = true;
        // rotateZ_M1 = true;
        // rotationAngle = 0; // Reset rotation angle
        back();
    }

    if (event.key === 'r' && !isRotatingX && !isRotatingY && !isRotatingZ) {
        start = true;
    }

    if (event.key === 'k' && !isRotatingX && !isRotatingY && !isRotatingZ) {
        console.log(cubelets.forEach(
            cubelet => console.log(cubelet.userData.number
        )));}

    if (event.key === "p" && !isRotatingX && !isRotatingY && !isRotatingZ){
        const girdiVerisi = mycube.state;
        tahminYap(girdiVerisi);
    }
        
    

});


// Tüm fonksiyonları bir diziye ekleyin
const functions = [
    left,
    left_prime,
    right,
    right_prime,
    up,
    up_prime,
    down,
    down_prime,
    front,
    front_prime,
    back,
    back_prime
];

// Rastgele bir fonksiyon seçin ve çalıştırın
function executeRandomFunction() {
    // Rastgele bir indeks seçin
    const randomIndex = Math.floor(Math.random() * functions.length);
    
    // Rastgele seçilen fonksiyonu çalıştırın
    functions[randomIndex]();
}





// Animation loop
function animate() {
    requestAnimationFrame(animate);
    if (isRotatingX) {
        if (rotateX_M1) {
            // Find all cubelets with position.x = -1
            const cubeletsToRotate = cubelets.filter(cubelet => cubelet.userData.position.x === -1);
            
            // Rotate these cubelets around the X-axis

            const remainingAngle = targetAngle - rotationAngle;
            const step = Math.min(angleStep, remainingAngle);

            // Apply the rotation matrix to each cubelet individually
            cubeletsToRotate.forEach(cubelet => {
                rotateCubeAroundPoint(cubelet,new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0), step);
            

                //const quaternion = new THREE.Quaternion();
                //quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0).normalize(), step);
                //cubelet.applyQuaternion(quaternion);
            });

            // Update the rotation angle
            rotationAngle += step;
            

            // Check if rotation is complete
            if (rotationAngle >= targetAngle) {
                isRotatingX = false; // Stop rotating
                rotateX_M1 = false;
                cubeletsToRotate.forEach(cubelet => {
                const oldY = cubelet.userData.position.y;
                const oldZ = cubelet.userData.position.z;
                cubelet.userData.position.y = -oldZ;
                cubelet.userData.position.z = oldY;
                // update_number(cubelet)
                tahminYap(mycube.state);
            })
            }
        }
        if (rotateX_M1_R) {
            // Find all cubelets with position.x = -1
            const cubeletsToRotate = cubelets.filter(cubelet => cubelet.userData.position.x === -1);
            
            // Rotate these cubelets around the X-axis

            const remainingAngle = targetAngle - rotationAngle;
            const step = Math.min(angleStep, remainingAngle);

            // Apply the rotation matrix to each cubelet individually
            cubeletsToRotate.forEach(cubelet => {
                rotateCubeAroundPoint(cubelet,new THREE.Vector3(-1, 0, 0), new THREE.Vector3(-1, 0, 0), step);
            });

            // Update the rotation angle
            rotationAngle += step;
            

            // Check if rotation is complete
            if (rotationAngle >= targetAngle) {
                isRotatingX = false; // Stop rotating
                rotateX_M1_R = false;
                cubeletsToRotate.forEach(cubelet => {
                const oldY = cubelet.userData.position.y;
                const oldZ = cubelet.userData.position.z;
                cubelet.userData.position.y = oldZ;
                cubelet.userData.position.z = -oldY;
                // update_number(cubelet);
                tahminYap(mycube.state);

            })
            }
        }
        if (rotateX_1) {
            // Find all cubelets with position.x = 1
            const cubeletsToRotate = cubelets.filter(cubelet => cubelet.userData.position.x === 1);
            
            // Rotate these cubelets around the X-axis

            const remainingAngle = targetAngle - rotationAngle;
            const step = Math.min(angleStep, remainingAngle);

            // Apply the rotation matrix to each cubelet individually
            cubeletsToRotate.forEach(cubelet => {
                rotateCubeAroundPoint(cubelet,new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), step);

            });

            // Update the rotation angle
            rotationAngle += step;
            

            // Check if rotation is complete
            if (rotationAngle >= targetAngle) {
                isRotatingX = false; // Stop rotating
                rotateX_1 = false;
                cubeletsToRotate.forEach(cubelet => {
                const oldY = cubelet.userData.position.y;
                const oldZ = cubelet.userData.position.z;
                cubelet.userData.position.y = oldZ;
                cubelet.userData.position.z = -oldY;
                // update_number(cubelet);
                tahminYap(mycube.state);
                
            })
            }
        }
        if (rotateX_1_R) {
            // Find all cubelets with position.x = 1
            const cubeletsToRotate = cubelets.filter(cubelet => cubelet.userData.position.x === 1);
            
            // Rotate these cubelets around the X-axis

            const remainingAngle = targetAngle - rotationAngle;
            const step = Math.min(angleStep, remainingAngle);

            // Apply the rotation matrix to each cubelet individually
            cubeletsToRotate.forEach(cubelet => {
                rotateCubeAroundPoint(cubelet,new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0), step);

            });

            // Update the rotation angle
            rotationAngle += step;
            

            // Check if rotation is complete
            if (rotationAngle >= targetAngle) {
                isRotatingX = false; // Stop rotating
                rotateX_1_R = false;
                cubeletsToRotate.forEach(cubelet => {
                const oldY = cubelet.userData.position.y;
                const oldZ = cubelet.userData.position.z;
                cubelet.userData.position.y = -oldZ;
                cubelet.userData.position.z = oldY;
                // update_number(cubelet);
                tahminYap(mycube.state);
            })
            }
        }   
        
    }


    if (isRotatingY) {
        if (rotateY_M1) {
            // Find all cubelets with position.y = -1
            const cubeletsToRotate = cubelets.filter(cubelet => cubelet.userData.position.y === -1);
            
            // Rotate these cubelets around the X-axis

            const remainingAngle = targetAngle - rotationAngle;
            const step = Math.min(angleStep, remainingAngle);

            // Apply the rotation matrix to each cubelet individually
            cubeletsToRotate.forEach(cubelet => {
                rotateCubeAroundPoint(cubelet,new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0), step);
            });

            // Update the rotation angle
            rotationAngle += step;
            

            // Check if rotation is complete
            if (rotationAngle >= targetAngle) {
                isRotatingY = false; // Stop rotating
                rotateY_M1 = false;
                cubeletsToRotate.forEach(cubelet => {
                const oldX = cubelet.userData.position.x;
                const oldZ = cubelet.userData.position.z;
                cubelet.userData.position.x = oldZ;
                cubelet.userData.position.z = -oldX;
                // update_number(cubelet);
                tahminYap(mycube.state);
            })
            }
        }
        if (rotateY_M1_R) {
            // Find all cubelets with position.y = -1
            const cubeletsToRotate = cubelets.filter(cubelet => cubelet.userData.position.y === -1);
            
            // Rotate these cubelets around the Y-axis

            const remainingAngle = targetAngle - rotationAngle;
            const step = Math.min(angleStep, remainingAngle);

            // Apply the rotation matrix to each cubelet individually
            cubeletsToRotate.forEach(cubelet => {
                rotateCubeAroundPoint(cubelet,new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -1, 0), step);
            });

            // Update the rotation angle
            rotationAngle += step;
            

            // Check if rotation is complete
            if (rotationAngle >= targetAngle) {
                isRotatingY = false; // Stop rotating
                rotateY_M1_R = false;
                cubeletsToRotate.forEach(cubelet => {
                    const oldX = cubelet.userData.position.x;
                    const oldZ = cubelet.userData.position.z;
                    cubelet.userData.position.x = -oldZ;
                    cubelet.userData.position.z = oldX;
                    // update_number(cubelet);
                    tahminYap(mycube.state);
                })
            }
        }
        if (rotateY_1) {
            // Find all cubelets with position.y = 1
            const cubeletsToRotate = cubelets.filter(cubelet => cubelet.userData.position.y === 1);
            
            // Rotate these cubelets around the Y-axis

            const remainingAngle = targetAngle - rotationAngle;
            const step = Math.min(angleStep, remainingAngle);

            // Apply the rotation matrix to each cubelet individually
            cubeletsToRotate.forEach(cubelet => {
                rotateCubeAroundPoint(cubelet,new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), step);

            });

            // Update the rotation angle
            rotationAngle += step;
            

            // Check if rotation is complete
            if (rotationAngle >= targetAngle) {
                isRotatingY = false; // Stop rotating
                rotateY_1 = false;
                cubeletsToRotate.forEach(cubelet => {
                    const oldX = cubelet.userData.position.x;
                    const oldZ = cubelet.userData.position.z;
                    cubelet.userData.position.x = -oldZ;
                    cubelet.userData.position.z = oldX;
                    // update_number(cubelet);
                    tahminYap(mycube.state);
                })
            }
        }
        if (rotateY_1_R) {
            // Find all cubelets with position.y = 1
            const cubeletsToRotate = cubelets.filter(cubelet => cubelet.userData.position.y === 1);
            
            // Rotate these cubelets around the X-axis

            const remainingAngle = targetAngle - rotationAngle;
            const step = Math.min(angleStep, remainingAngle);

            // Apply the rotation matrix to each cubelet individually
            cubeletsToRotate.forEach(cubelet => {
                rotateCubeAroundPoint(cubelet,new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0), step);

            });

            // Update the rotation angle
            rotationAngle += step;
            

            // Check if rotation is complete
            if (rotationAngle >= targetAngle) {
                isRotatingY = false; // Stop rotating
                rotateY_1_R = false;
                cubeletsToRotate.forEach(cubelet => {
                    const oldX = cubelet.userData.position.x;
                    const oldZ = cubelet.userData.position.z;
                    cubelet.userData.position.x = oldZ;
                    cubelet.userData.position.z = -oldX;
                    // update_number(cubelet);
                    tahminYap(mycube.state);
                })
            }
        }
    }



    if (isRotatingZ) {
        if (rotateZ_M1) {

            // Find all cubelets with position.z = -1
            const cubeletsToRotate = cubelets.filter(cubelet => cubelet.userData.position.z === -1);
            
            // Rotate these cubelets around the X-axis

            const remainingAngle = targetAngle - rotationAngle;
            const step = Math.min(angleStep, remainingAngle);

            // Apply the rotation matrix to each cubelet individually
            cubeletsToRotate.forEach(cubelet => {
                rotateCubeAroundPoint(cubelet,new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 1), step);
            });

            // Update the rotation angle
            rotationAngle += step;
            

            // Check if rotation is complete
            if (rotationAngle >= targetAngle) {
                isRotatingZ = false; // Stop rotating
                rotateZ_M1 = false;
                cubeletsToRotate.forEach(cubelet => {
                const oldX = cubelet.userData.position.x;
                const oldY = cubelet.userData.position.y;

                cubelet.userData.position.x = -oldY;
                cubelet.userData.position.y = oldX;
                // update_number(cubelet);
                tahminYap(mycube.state);
                })
            }
        }
        if (rotateZ_M1_R) {

            // Find all cubelets with position.z = -1
            const cubeletsToRotate = cubelets.filter(cubelet => cubelet.userData.position.z === -1);
            
            // Rotate these cubelets around the X-axis

            const remainingAngle = targetAngle - rotationAngle;
            const step = Math.min(angleStep, remainingAngle);

            // Apply the rotation matrix to each cubelet individually
            cubeletsToRotate.forEach(cubelet => {
                rotateCubeAroundPoint(cubelet,new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -1), step);
            });

            // Update the rotation angle
            rotationAngle += step;
            

            // Check if rotation is complete
            if (rotationAngle >= targetAngle) {
                isRotatingZ = false; // Stop rotating
                rotateZ_M1_R = false;
                cubeletsToRotate.forEach(cubelet => {
                const oldX = cubelet.userData.position.x;
                const oldY = cubelet.userData.position.y;

                cubelet.userData.position.x = oldY;
                cubelet.userData.position.y = -oldX;
                // update_number(cubelet);
                tahminYap(mycube.state);
                })
            }
        }
        if (rotateZ_1) {

            // Find all cubelets with position.z = 1
            const cubeletsToRotate = cubelets.filter(cubelet => cubelet.userData.position.z === 1);
            
            // Rotate these cubelets around the Z-axis

            const remainingAngle = targetAngle - rotationAngle;
            const step = Math.min(angleStep, remainingAngle);

            // Apply the rotation matrix to each cubelet individually
            cubeletsToRotate.forEach(cubelet => {
                rotateCubeAroundPoint(cubelet,new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -1), step);
            });

            // Update the rotation angle
            rotationAngle += step;
            

            // Check if rotation is complete
            if (rotationAngle >= targetAngle) {
                isRotatingZ = false; // Stop rotating
                rotateZ_1 = false;
                cubeletsToRotate.forEach(cubelet => {
                const oldX = cubelet.userData.position.x;
                const oldY = cubelet.userData.position.y;

                cubelet.userData.position.x = oldY;
                cubelet.userData.position.y = -oldX;
                // update_number(cubelet);
                tahminYap(mycube.state);
                })
            }
        }
        if (rotateZ_1_R) {

            // Find all cubelets with position.z = -1
            const cubeletsToRotate = cubelets.filter(cubelet => cubelet.userData.position.z === 1);
            
            // Rotate these cubelets around the X-axis

            const remainingAngle = targetAngle - rotationAngle;
            const step = Math.min(angleStep, remainingAngle);

            // Apply the rotation matrix to each cubelet individually
            cubeletsToRotate.forEach(cubelet => {
                rotateCubeAroundPoint(cubelet,new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 1), step);
            });

            // Update the rotation angle
            rotationAngle += step;
            

            // Check if rotation is complete
            if (rotationAngle >= targetAngle) {
                isRotatingZ = false; // Stop rotating
                rotateZ_1_R = false;
                cubeletsToRotate.forEach(cubelet => {
                const oldX = cubelet.userData.position.x;
                const oldY = cubelet.userData.position.y;

                cubelet.userData.position.x = -oldY;
                cubelet.userData.position.y = oldX;
                // update_number(cubelet);
                tahminYap(mycube.state);
                })
            }
        }

    }

    
    if (start && !isRotatingX && !isRotatingY && !isRotatingZ) {
        console.log("Karıştır")
        executeRandomFunction();
    }


    // camera.position.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.01));
    // camera.lookAt(0, 0, 0);
    // Render the scene
    renderer.render(scene, camera);
}


animate();