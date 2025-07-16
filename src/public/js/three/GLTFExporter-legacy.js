/**
 * GLTFExporter for Three.js r148 - Legacy JavaScript version
 * Simplified version for non-module environments
 */

( function () {

    function GLTFExporter() {}

    GLTFExporter.prototype = {

        constructor: GLTFExporter,

        parse: function ( input, onCompleted, options ) {

            const DEFAULT_OPTIONS = {
                binary: false,
                trs: false,
                onlyVisible: true,
                truncateDrawRange: true,
                embedImages: true,
                maxTextureSize: Infinity,
                animations: [],
                includeCustomExtensions: false
            };

            options = Object.assign( {}, DEFAULT_OPTIONS, options );

            if ( options.animations.length > 0 ) {
                console.warn( 'GLTFExporter: animations not supported in this simplified version' );
            }

            const outputJSON = {
                asset: {
                    version: '2.0',
                    generator: 'Three.js GLTFExporter'
                }
            };

            const byteOffset = 0;
            const buffers = [];
            const pending = [];
            const nodeMap = new Map();
            const skins = [];
            const extensionsUsed = {};

            const cachedData = {
                meshes: new Map(),
                attributes: new Map(),
                attributesNormalized: new Map(),
                materials: new Map(),
                textures: new Map(),
                images: new Map()
            };

            const state = {
                uuid: THREE.MathUtils.generateUUID(),
                scene: 0,
                nodes: [],
                materials: [],
                meshes: [],
                cameras: [],
                lights: [],
                extensionsUsed: [],
                extensionsRequired: []
            };

            // Process the scene
            processScene( input );

            // Finalize
            if ( outputJSON.buffers && outputJSON.buffers.length > 0 ) {

                const blob = new Blob( buffers, { type: 'application/octet-stream' } );
                const reader = new FileReader();
                reader.readAsDataURL( blob );
                reader.onloadend = function () {
                    outputJSON.buffers[ 0 ].uri = reader.result;
                    onCompleted( outputJSON );
                };

            } else {

                onCompleted( outputJSON );

            }

            // Process scene
            function processScene( object ) {

                outputJSON.scene = outputJSON.scene || 0;
                outputJSON.scenes = [{
                    nodes: []
                }];

                if ( object.name ) {
                    outputJSON.scenes[ 0 ].name = object.name;
                }

                outputJSON.nodes = [];
                const nodeList = [];
                object.traverse( function ( child ) {

                    if ( options.onlyVisible && child.visible === false ) return;

                    const node = processNode( child );
                    if ( node !== null ) {
                        nodeList.push( node );
                        outputJSON.nodes.push( node );
                    }

                } );

                if ( nodeList.length > 0 ) {
                    outputJSON.scenes[ 0 ].nodes = nodeList.map( ( node, index ) => index );
                }

            }

            // Process individual node
            function processNode( object ) {

                if ( !object.isMesh && !object.isLine && !object.isPoints && !object.isLight && !object.isCamera ) {
                    return null;
                }

                const node = {};

                if ( object.name !== '' ) {
                    node.name = object.name;
                }

                // Position, rotation, scale
                if ( object.position.x !== 0 || object.position.y !== 0 || object.position.z !== 0 ) {
                    node.translation = object.position.toArray();
                }

                if ( object.quaternion.x !== 0 || object.quaternion.y !== 0 || object.quaternion.z !== 0 || object.quaternion.w !== 1 ) {
                    node.rotation = object.quaternion.toArray();
                }

                if ( object.scale.x !== 1 || object.scale.y !== 1 || object.scale.z !== 1 ) {
                    node.scale = object.scale.toArray();
                }

                // Process mesh
                if ( object.isMesh || object.isLine || object.isPoints ) {
                    const mesh = processMesh( object );
                    if ( mesh !== null ) {
                        node.mesh = outputJSON.meshes.length;
                        outputJSON.meshes = outputJSON.meshes || [];
                        outputJSON.meshes.push( mesh );
                    }
                }

                return node;

            }

            // Process mesh
            function processMesh( mesh ) {

                const meshDef = {
                    primitives: []
                };

                const geometry = mesh.geometry;
                const material = mesh.material;

                if ( geometry === undefined ) return null;

                // Process geometry
                const primitive = {
                    mode: THREE.TrianglesDrawMode
                };

                if ( geometry.isBufferGeometry ) {

                    const attributes = {};
                    const geometry_attributes = geometry.attributes;

                    // Process attributes
                    for ( const attributeName in geometry_attributes ) {

                        const attribute = geometry_attributes[ attributeName ];
                        const itemSize = attribute.itemSize;
                        const array = attribute.array;

                        if ( attributeName === 'position' ) {
                            attributes.POSITION = processAccessor( array, itemSize );
                        } else if ( attributeName === 'normal' ) {
                            attributes.NORMAL = processAccessor( array, itemSize );
                        } else if ( attributeName === 'uv' ) {
                            attributes.TEXCOORD_0 = processAccessor( array, itemSize );
                        }

                    }

                    primitive.attributes = attributes;

                    // Process indices
                    if ( geometry.index !== null ) {
                        primitive.indices = processAccessor( geometry.index.array, 1 );
                    }

                    // Process material
                    if ( material !== undefined ) {
                        const materialIndex = processMaterial( material );
                        if ( materialIndex !== null ) {
                            primitive.material = materialIndex;
                        }
                    }

                    meshDef.primitives.push( primitive );

                }

                return meshDef;

            }

            // Process accessor
            function processAccessor( array, itemSize ) {

                outputJSON.accessors = outputJSON.accessors || [];
                
                const minMax = getMinMax( array, itemSize );
                const accessor = {
                    bufferView: outputJSON.bufferViews ? outputJSON.bufferViews.length : 0,
                    componentType: array instanceof Float32Array ? 5126 : 5123,
                    count: array.length / itemSize,
                    max: minMax.max,
                    min: minMax.min,
                    type: itemSize === 1 ? 'SCALAR' : ( itemSize === 3 ? 'VEC3' : 'VEC2' )
                };

                outputJSON.accessors.push( accessor );

                // Process buffer view
                outputJSON.bufferViews = outputJSON.bufferViews || [];
                const bufferView = {
                    buffer: 0,
                    byteLength: array.byteLength,
                    byteOffset: buffers.reduce( ( acc, buf ) => acc + buf.byteLength, 0 )
                };
                outputJSON.bufferViews.push( bufferView );

                // Add to buffer
                buffers.push( array );

                // Create buffer if needed
                if ( !outputJSON.buffers ) {
                    outputJSON.buffers = [{
                        byteLength: 0
                    }];
                }
                outputJSON.buffers[ 0 ].byteLength += array.byteLength;

                return outputJSON.accessors.length - 1;

            }

            // Get min/max values
            function getMinMax( array, itemSize ) {

                const min = new Array( itemSize ).fill( Infinity );
                const max = new Array( itemSize ).fill( -Infinity );

                for ( let i = 0; i < array.length; i += itemSize ) {
                    for ( let j = 0; j < itemSize; j++ ) {
                        min[ j ] = Math.min( min[ j ], array[ i + j ] );
                        max[ j ] = Math.max( max[ j ], array[ i + j ] );
                    }
                }

                return { min, max };

            }

            // Process material
            function processMaterial( material ) {

                outputJSON.materials = outputJSON.materials || [];

                const materialDef = {
                    pbrMetallicRoughness: {}
                };

                if ( material.name ) {
                    materialDef.name = material.name;
                }

                // Base color
                if ( material.color ) {
                    materialDef.pbrMetallicRoughness.baseColorFactor = material.color.toArray();
                }

                // Metalness and roughness
                if ( material.metalness !== undefined ) {
                    materialDef.pbrMetallicRoughness.metallicFactor = material.metalness;
                }

                if ( material.roughness !== undefined ) {
                    materialDef.pbrMetallicRoughness.roughnessFactor = material.roughness;
                }

                // Emissive
                if ( material.emissive && material.emissive.isColor ) {
                    materialDef.emissiveFactor = material.emissive.toArray();
                }

                // Opacity
                if ( material.opacity !== undefined && material.opacity < 1 ) {
                    materialDef.alphaMode = 'BLEND';
                }

                // Double sided
                if ( material.side === THREE.DoubleSide ) {
                    materialDef.doubleSided = true;
                }

                outputJSON.materials.push( materialDef );

                return outputJSON.materials.length - 1;

            }

        }

    };

    // Export to global scope
    window.GLTFExporter = GLTFExporter;

} )();