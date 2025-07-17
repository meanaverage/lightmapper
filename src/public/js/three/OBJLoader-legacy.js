// OBJLoader for Three.js r148 - Legacy format for global THREE
// Adapted from Three.js examples

(function() {
    'use strict';

    class OBJLoader extends THREE.Loader {
        constructor( manager ) {
            super( manager );
            this.materials = null;
        }

        load( url, onLoad, onProgress, onError ) {
            const scope = this;
            const loader = new THREE.FileLoader( this.manager );
            loader.setPath( this.path );
            loader.setRequestHeader( this.requestHeader );
            loader.setWithCredentials( this.withCredentials );
            loader.load( url, function ( text ) {
                try {
                    onLoad( scope.parse( text ) );
                } catch ( e ) {
                    if ( onError ) {
                        onError( e );
                    } else {
                        console.error( e );
                    }
                    scope.manager.itemError( url );
                }
            }, onProgress, onError );
        }

        setMaterials( materials ) {
            this.materials = materials;
            return this;
        }

        parse( text ) {
            const state = {
                objects: [],
                object: {},
                vertices: [],
                normals: [],
                colors: [],
                uvs: [],
                materials: {},
                materialLibraries: [],
                startObject: function ( name, fromDeclaration ) {
                    if ( this.object && this.object.fromDeclaration === false ) {
                        this.object.name = name;
                        this.object.fromDeclaration = ( fromDeclaration !== false );
                        return;
                    }
                    const previousMaterial = ( this.object && typeof this.object.currentMaterial === 'function' ? this.object.currentMaterial() : undefined );
                    if ( this.object && typeof this.object._finalize === 'function' ) {
                        this.object._finalize( true );
                    }
                    this.object = {
                        name: name || '',
                        fromDeclaration: ( fromDeclaration !== false ),
                        geometry: {
                            vertices: [],
                            normals: [],
                            colors: [],
                            uvs: [],
                            hasUVIndices: false
                        },
                        materials: [],
                        currentMaterial: function () {
                            if ( this.materials.length > 0 ) {
                                return this.materials[ this.materials.length - 1 ];
                            }
                            return undefined;
                        },
                        _finalize: function ( end ) {
                            const lastMultiMaterial = this.currentMaterial();
                            if ( lastMultiMaterial && lastMultiMaterial.groupEnd === - 1 ) {
                                lastMultiMaterial.groupEnd = this.geometry.vertices.length / 3;
                                lastMultiMaterial.groupCount = lastMultiMaterial.groupEnd - lastMultiMaterial.groupStart;
                                lastMultiMaterial.inherited = false;
                            }
                            if ( end && this.materials.length > 1 ) {
                                for ( let mi = this.materials.length - 1; mi >= 0; mi -- ) {
                                    if ( this.materials[ mi ].groupCount <= 0 ) {
                                        this.materials.splice( mi, 1 );
                                    }
                                }
                            }
                            if ( end && this.materials.length === 0 ) {
                                this.materials.push( {
                                    name: '',
                                    smooth: this.smooth
                                } );
                            }
                            return lastMultiMaterial;
                        }
                    };
                    if ( previousMaterial && previousMaterial.name && typeof previousMaterial.clone === 'function' ) {
                        const declared = previousMaterial.clone( 0 );
                        declared.inherited = true;
                        this.object.materials.push( declared );
                    }
                    this.objects.push( this.object );
                },
                finalize: function () {
                    if ( this.object && typeof this.object._finalize === 'function' ) {
                        this.object._finalize( true );
                    }
                },
                parseVertexIndex: function ( value, len ) {
                    const index = parseInt( value, 10 );
                    return ( index >= 0 ? index - 1 : index + len / 3 ) * 3;
                },
                parseNormalIndex: function ( value, len ) {
                    const index = parseInt( value, 10 );
                    return ( index >= 0 ? index - 1 : index + len / 3 ) * 3;
                },
                parseUVIndex: function ( value, len ) {
                    const index = parseInt( value, 10 );
                    return ( index >= 0 ? index - 1 : index + len / 2 ) * 2;
                },
                addVertex: function ( a, b, c ) {
                    const src = this.vertices;
                    const dst = this.object.geometry.vertices;
                    dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
                    dst.push( src[ b + 0 ], src[ b + 1 ], src[ b + 2 ] );
                    dst.push( src[ c + 0 ], src[ c + 1 ], src[ c + 2 ] );
                },
                addVertexPoint: function ( a ) {
                    const src = this.vertices;
                    const dst = this.object.geometry.vertices;
                    dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
                },
                addVertexLine: function ( a ) {
                    const src = this.vertices;
                    const dst = this.object.geometry.vertices;
                    dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
                },
                addNormal: function ( a, b, c ) {
                    const src = this.normals;
                    const dst = this.object.geometry.normals;
                    dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
                    dst.push( src[ b + 0 ], src[ b + 1 ], src[ b + 2 ] );
                    dst.push( src[ c + 0 ], src[ c + 1 ], src[ c + 2 ] );
                },
                addFaceNormal: function ( a, b, c ) {
                    const src = this.vertices;
                    const dst = this.object.geometry.normals;
                    const vA = new THREE.Vector3( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
                    const vB = new THREE.Vector3( src[ b + 0 ], src[ b + 1 ], src[ b + 2 ] );
                    const vC = new THREE.Vector3( src[ c + 0 ], src[ c + 1 ], src[ c + 2 ] );
                    const cb = new THREE.Vector3();
                    const ab = new THREE.Vector3();
                    cb.subVectors( vC, vB );
                    ab.subVectors( vA, vB );
                    cb.cross( ab );
                    cb.normalize();
                    dst.push( cb.x, cb.y, cb.z );
                    dst.push( cb.x, cb.y, cb.z );
                    dst.push( cb.x, cb.y, cb.z );
                },
                addColor: function ( a, b, c ) {
                    const src = this.colors;
                    const dst = this.object.geometry.colors;
                    if ( src[ a ] !== undefined ) dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
                    if ( src[ b ] !== undefined ) dst.push( src[ b + 0 ], src[ b + 1 ], src[ b + 2 ] );
                    if ( src[ c ] !== undefined ) dst.push( src[ c + 0 ], src[ c + 1 ], src[ c + 2 ] );
                },
                addUV: function ( a, b, c ) {
                    const src = this.uvs;
                    const dst = this.object.geometry.uvs;
                    dst.push( src[ a + 0 ], src[ a + 1 ] );
                    dst.push( src[ b + 0 ], src[ b + 1 ] );
                    dst.push( src[ c + 0 ], src[ c + 1 ] );
                },
                addDefaultUV: function () {
                    const dst = this.object.geometry.uvs;
                    dst.push( 0, 0 );
                    dst.push( 0, 0 );
                    dst.push( 0, 0 );
                },
                addUVLine: function ( a ) {
                    const src = this.uvs;
                    const dst = this.object.geometry.uvs;
                    dst.push( src[ a + 0 ], src[ a + 1 ] );
                },
                addFace: function ( a, b, c, ua, ub, uc, na, nb, nc ) {
                    const vLen = this.vertices.length;
                    let ia = this.parseVertexIndex( a, vLen );
                    let ib = this.parseVertexIndex( b, vLen );
                    let ic = this.parseVertexIndex( c, vLen );
                    this.addVertex( ia, ib, ic );
                    this.addColor( ia, ib, ic );
                    if ( ua !== undefined && ua !== '' ) {
                        const uvLen = this.uvs.length;
                        ia = this.parseUVIndex( ua, uvLen );
                        ib = this.parseUVIndex( ub, uvLen );
                        ic = this.parseUVIndex( uc, uvLen );
                        this.addUV( ia, ib, ic );
                        this.object.geometry.hasUVIndices = true;
                    } else {
                        this.addDefaultUV();
                    }
                    if ( na !== undefined && na !== '' ) {
                        const nLen = this.normals.length;
                        ia = this.parseNormalIndex( na, nLen );
                        ib = this.parseNormalIndex( nb, nLen );
                        ic = this.parseNormalIndex( nc, nLen );
                        this.addNormal( ia, ib, ic );
                    } else {
                        this.addFaceNormal( ia, ib, ic );
                    }
                },
                addPointGeometry: function ( vertices ) {
                    this.object.geometry.type = 'Points';
                    const vLen = this.vertices.length;
                    for ( let vi = 0, l = vertices.length; vi < l; vi ++ ) {
                        const index = this.parseVertexIndex( vertices[ vi ], vLen );
                        this.addVertexPoint( index );
                        this.addColor( index );
                    }
                },
                addLineGeometry: function ( vertices, uvs ) {
                    this.object.geometry.type = 'Line';
                    const vLen = this.vertices.length;
                    const uvLen = this.uvs.length;
                    for ( let vi = 0, l = vertices.length; vi < l; vi ++ ) {
                        this.addVertexLine( this.parseVertexIndex( vertices[ vi ], vLen ) );
                    }
                    for ( let uvi = 0, l = uvs.length; uvi < l; uvi ++ ) {
                        this.addUVLine( this.parseUVIndex( uvs[ uvi ], uvLen ) );
                    }
                }
            };
            state.startObject( '', false );
            if ( text.indexOf( '\r\n' ) !== - 1 ) {
                text = text.replace( /\r\n/g, '\n' );
            }
            if ( text.indexOf( '\\\n' ) !== - 1 ) {
                text = text.replace( /\\\n/g, '' );
            }
            const lines = text.split( '\n' );
            let result = [];
            for ( let i = 0, l = lines.length; i < l; i ++ ) {
                const line = lines[ i ].trimStart();
                if ( line.length === 0 ) continue;
                const lineFirstChar = line.charAt( 0 );
                if ( lineFirstChar === '#' ) continue;
                if ( lineFirstChar === 'v' ) {
                    const data = line.split( /\s+/ );
                    switch ( data[ 0 ] ) {
                        case 'v':
                            state.vertices.push(
                                parseFloat( data[ 1 ] ),
                                parseFloat( data[ 2 ] ),
                                parseFloat( data[ 3 ] )
                            );
                            if ( data.length >= 7 ) {
                                state.colors.push(
                                    parseFloat( data[ 4 ] ),
                                    parseFloat( data[ 5 ] ),
                                    parseFloat( data[ 6 ] )
                                );
                            } else {
                                state.colors.push( undefined, undefined, undefined );
                            }
                            break;
                        case 'vn':
                            state.normals.push(
                                parseFloat( data[ 1 ] ),
                                parseFloat( data[ 2 ] ),
                                parseFloat( data[ 3 ] )
                            );
                            break;
                        case 'vt':
                            state.uvs.push(
                                parseFloat( data[ 1 ] ),
                                parseFloat( data[ 2 ] )
                            );
                            break;
                    }
                } else if ( lineFirstChar === 'f' ) {
                    const lineData = line.slice( 1 ).trim();
                    const vertexData = lineData.split( /\s+/ );
                    const faceVertices = [];
                    for ( let j = 0, jl = vertexData.length; j < jl; j ++ ) {
                        const vertex = vertexData[ j ];
                        if ( vertex.length > 0 ) {
                            const vertexParts = vertex.split( '/' );
                            faceVertices.push( vertexParts );
                        }
                    }
                    const v1 = faceVertices[ 0 ];
                    for ( let j = 1, jl = faceVertices.length - 1; j < jl; j ++ ) {
                        const v2 = faceVertices[ j ];
                        const v3 = faceVertices[ j + 1 ];
                        state.addFace(
                            v1[ 0 ], v2[ 0 ], v3[ 0 ],
                            v1[ 1 ], v2[ 1 ], v3[ 1 ],
                            v1[ 2 ], v2[ 2 ], v3[ 2 ]
                        );
                    }
                } else if ( lineFirstChar === 'l' ) {
                    const lineParts = line.substring( 1 ).trim().split( ' ' );
                    let lineVertices = [];
                    const lineUVs = [];
                    if ( line.indexOf( '/' ) === - 1 ) {
                        lineVertices = lineParts;
                    } else {
                        for ( let li = 0, llen = lineParts.length; li < llen; li ++ ) {
                            const parts = lineParts[ li ].split( '/' );
                            if ( parts[ 0 ] !== '' ) lineVertices.push( parts[ 0 ] );
                            if ( parts[ 1 ] !== '' ) lineUVs.push( parts[ 1 ] );
                        }
                    }
                    state.addLineGeometry( lineVertices, lineUVs );
                } else if ( lineFirstChar === 'p' ) {
                    const lineData = line.slice( 1 ).trim();
                    const pointData = lineData.split( ' ' );
                    state.addPointGeometry( pointData );
                } else if ( ( result = /^o\s+(.+)?/.exec( line ) ) !== null ) {
                    const name = result[ 1 ].trim();
                    state.startObject( name );
                } else if ( /^g/.test( line ) ) {
                    // group
                } else if ( /^usemtl/.test( line ) ) {
                    // material
                    state.object.currentMaterial().name = line.substring( 7 ).trim();
                } else if ( /^mtllib/.test( line ) ) {
                    // mtl file
                } else if ( /^s/.test( line ) ) {
                    // smooth shading
                } else {
                    if ( line === '\0' ) continue;
                    console.warn( 'THREE.OBJLoader: Unexpected line: "' + line + '"' );
                }
            }
            state.finalize();
            const container = new THREE.Group();
            for ( let i = 0, l = state.objects.length; i < l; i ++ ) {
                const object = state.objects[ i ];
                const geometry = object.geometry;
                const isLine = ( geometry.type === 'Line' );
                const isPoints = ( geometry.type === 'Points' );
                let hasVertexColors = false;
                if ( geometry.vertices.length === 0 ) continue;
                const buffergeometry = new THREE.BufferGeometry();
                buffergeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( geometry.vertices, 3 ) );
                if ( geometry.normals.length > 0 ) {
                    buffergeometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( geometry.normals, 3 ) );
                }
                if ( geometry.colors.length > 0 ) {
                    hasVertexColors = true;
                    buffergeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( geometry.colors, 3 ) );
                }
                if ( geometry.hasUVIndices === true ) {
                    buffergeometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( geometry.uvs, 2 ) );
                }
                const createdMaterial = new THREE.MeshStandardMaterial();
                if ( hasVertexColors === true ) {
                    createdMaterial.vertexColors = true;
                }
                if ( isLine ) {
                    const line = new THREE.Line( buffergeometry, createdMaterial );
                    line.name = object.name;
                    container.add( line );
                } else if ( isPoints ) {
                    const points = new THREE.Points( buffergeometry, createdMaterial );
                    points.name = object.name;
                    container.add( points );
                } else {
                    const mesh = new THREE.Mesh( buffergeometry, createdMaterial );
                    mesh.name = object.name;
                    container.add( mesh );
                }
            }
            return container;
        }
    }

    // Make OBJLoader available globally
    window.OBJLoader = OBJLoader;
    
    console.log('✅ OBJLoader loaded (legacy format)');

})();