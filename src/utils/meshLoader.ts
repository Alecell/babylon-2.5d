//  Aqui teria que ter o evento de loading

export const meshLoader = async (assets: Promise<any>[]) => {
  return await Promise.all(assets);
}